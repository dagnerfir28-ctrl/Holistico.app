/**
 * Cliente del asistente con IA.
 *  - vista-previa: capacidad «sample» del visor de claude.ai (consulta real a Claude con la cuenta de quien mira).
 *  - servidor: función propia (/api/asistente) con la clave en variables de entorno, límites y streaming SSE.
 *  - ninguno: no hay IA conectada; la app lo dice con claridad (nunca simula respuestas).
 * En todos los casos la recuperación de fichas usa solo contenido publicado.
 */
import type { Actividad } from '../domain/types';
import { API_ASISTENTE, ES_ARTIFACT } from '../config/env';
import { obtenerSample, type SampleError } from '../lib/platform';
import { INSTRUCCIONES_SISTEMA, MENSAJE_CONTINUAR, construirMensajes, recuperarFichas, type MensajeChat } from './core';

export type Proveedor = 'vista-previa' | 'servidor' | 'ninguno';

export async function detectarProveedor(): Promise<Proveedor> {
  if (ES_ARTIFACT) return (await obtenerSample()) ? 'vista-previa' : 'ninguno';
  if (import.meta.env.VITE_DATA_MODE === 'supabase' && API_ASISTENTE) return 'servidor';
  return 'ninguno';
}

export class ErrorAsistente extends Error {
  constructor(
    public codigo: string,
    mensaje: string,
    public parcial = '',
  ) {
    super(mensaje);
  }
}

export function mensajeError(codigo: string, detalle?: string): string {
  switch (codigo) {
    case 'cancelled':
    case 'cancelado':
      return 'Respuesta detenida.';
    case 'not_granted':
      return 'No se concedió permiso para consultar a Claude desde esta vista previa.';
    case 'rate_limited':
      return 'Se alcanzó el límite de consultas por ahora. Prueba de nuevo en unos minutos.';
    case 'sampling_disabled':
      return 'Las consultas a Claude no están disponibles para esta cuenta en este momento.';
    case 'limite':
      return detalle || 'Alcanzaste el límite diario de consultas. Vuelve a intentarlo mañana.';
    case 'sin-acceso':
      return 'Tu cuenta no tiene acceso activo al asistente.';
    case 'red':
      return 'No hay conexión con el asistente. Revisa tu conexión e inténtalo de nuevo.';
    case 'no-disponible':
      return 'El asistente con IA no está disponible en esta versión.';
    default:
      return `El asistente no pudo responder${detalle ? `: ${detalle}` : '.'}`;
  }
}

export interface Consulta {
  pregunta: string;
  historial: MensajeChat[];
  publicadas: Actividad[];
  /** Para «Continuar»: reutiliza las mismas fichas de la respuesta anterior. */
  fichasPrevias?: string[];
  continuar?: boolean;
  signal: AbortSignal;
  onTexto: (textoCompleto: string) => void;
  /** Identificadores de las fichas enviadas al modelo (llega antes del texto, para validar citas mientras se escribe). */
  onFichas?: (ids: string[]) => void;
  /** Solo servidor: token de sesión para autenticar la petición. */
  token?: string;
}

export interface Respuesta {
  texto: string;
  truncada: boolean;
  fichas: string[];
  restantes?: number | null;
}

function normalizarTurnos(msgs: { rol: 'user' | 'assistant'; contenido: string }[]) {
  const out: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of msgs) {
    if (!m.contenido.trim()) continue;
    if (!out.length && m.rol === 'assistant') continue;
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === m.rol) ultimo.content += `\n\n${m.contenido}`;
    else out.push({ role: m.rol, content: m.contenido });
  }
  return out;
}

function elegirFichas(c: Consulta): Actividad[] {
  const publicadas = c.publicadas.filter((a) => a.estado === 'publicado');
  if (c.fichasPrevias?.length) {
    const porId = new Map(publicadas.map((a) => [a.id, a]));
    return c.fichasPrevias.map((id) => porId.get(id)).filter((a): a is Actividad => !!a);
  }
  return recuperarFichas(c.pregunta, publicadas, c.historial);
}

export async function consultar(proveedor: Proveedor, c: Consulta): Promise<Respuesta> {
  if (proveedor === 'vista-previa') return consultarVistaPrevia(c);
  if (proveedor === 'servidor') return consultarServidor(c);
  throw new ErrorAsistente('no-disponible', mensajeError('no-disponible'));
}

async function consultarVistaPrevia(c: Consulta): Promise<Respuesta> {
  const sample = await obtenerSample();
  if (!sample) throw new ErrorAsistente('no-disponible', mensajeError('no-disponible'));
  const fichas = elegirFichas(c);
  const pregunta = c.continuar ? MENSAJE_CONTINUAR : c.pregunta;
  const msgs = construirMensajes(pregunta, fichas, c.historial);
  const turnos = normalizarTurnos(msgs);
  turnos[0] = { ...turnos[0], content: `${INSTRUCCIONES_SISTEMA}\n\n${turnos[0].content}` };
  c.onFichas?.(fichas.map((a) => a.id));
  try {
    const r = await sample(turnos, { signal: c.signal, cache: false, onText: ({ text }) => c.onTexto(text) });
    return { texto: r.text, truncada: r.truncated, fichas: fichas.map((a) => a.id) };
  } catch (e) {
    const err = e as SampleError;
    throw new ErrorAsistente(err?.code ?? 'desconocido', mensajeError(err?.code ?? 'desconocido', err?.message), err?.text ?? '');
  }
}

/** Lee una respuesta SSE: eventos «meta», «texto», «fin» y «error». */
async function consultarServidor(c: Consulta): Promise<Respuesta> {
  let res: Response;
  try {
    res = await fetch(API_ASISTENTE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', ...(c.token ? { Authorization: `Bearer ${c.token}` } : {}) },
      body: JSON.stringify({ pregunta: c.continuar ? MENSAJE_CONTINUAR : c.pregunta, historial: c.historial.slice(-6), fichasPrevias: c.fichasPrevias ?? null, continuar: !!c.continuar }),
      signal: c.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw new ErrorAsistente('cancelado', mensajeError('cancelado'));
    throw new ErrorAsistente('red', mensajeError('red'));
  }
  if (!res.ok || !res.body) {
    let cuerpo: { codigo?: string; mensaje?: string } = {};
    try {
      cuerpo = await res.json();
    } catch {
      /* sin cuerpo */
    }
    throw new ErrorAsistente(cuerpo.codigo ?? `http-${res.status}`, mensajeError(cuerpo.codigo ?? 'desconocido', cuerpo.mensaje));
  }
  const lector = res.body.getReader();
  const dec = new TextDecoder();
  let buffer = '';
  let texto = '';
  let fichas: string[] = [];
  let truncada = false;
  let restantes: number | null = null;
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      buffer += dec.decode(value, { stream: true });
      let corte: number;
      while ((corte = buffer.indexOf('\n\n')) >= 0) {
        const bloque = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);
        const evento = /^event: (.+)$/m.exec(bloque)?.[1]?.trim();
        const datos = bloque
          .split('\n')
          .filter((l) => l.startsWith('data: '))
          .map((l) => l.slice(6))
          .join('\n');
        if (!evento || !datos) continue;
        const d = JSON.parse(datos);
        if (evento === 'meta') {
          fichas = d.fichas ?? [];
          restantes = d.restantes ?? null;
          c.onFichas?.(fichas);
        } else if (evento === 'texto') {
          texto += d.delta ?? '';
          c.onTexto(texto);
        } else if (evento === 'fin') {
          truncada = !!d.truncada;
        } else if (evento === 'error') {
          throw new ErrorAsistente(d.codigo ?? 'desconocido', mensajeError(d.codigo ?? 'desconocido', d.mensaje), texto);
        }
      }
    }
  } catch (e) {
    if (e instanceof ErrorAsistente) throw e;
    if ((e as Error)?.name === 'AbortError') throw new ErrorAsistente('cancelado', mensajeError('cancelado'), texto);
    throw new ErrorAsistente('red', mensajeError('red'), texto);
  }
  return { texto, truncada, fichas, restantes };
}
