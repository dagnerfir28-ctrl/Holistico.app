/**
 * Función del asistente con IA (lado servidor), independiente de la plataforma de hosting.
 *  - Exige sesión válida y acceso activo (o rol de administración).
 *  - Aplica una cuota diaria atómica por cuenta (base de datos).
 *  - Recupera solo fichas publicadas y depuradas, y las cita por identificador.
 *  - Llama a la API de Anthropic con streaming y reenvía el texto por SSE (eventos meta, texto, fin, error).
 *  - La clave de la API vive solo en variables de entorno del servidor.
 */
import type { Actividad } from '../src/domain/types';
import { INSTRUCCIONES_SISTEMA, MENSAJE_CONTINUAR, construirMensajes, recuperarFichas, type MensajeChat } from '../src/assistant/core';

export interface DependenciasAsistente {
  verificarUsuario: (token: string) => Promise<{ id: string; email: string } | null>;
  estadoAcceso: (token: string) => Promise<{ rol: string; acceso: string } | null>;
  consumirCuota: (userId: string, limite: number) => Promise<number>;
  registrarTokens?: (userId: string, entrada: number, salida: number) => Promise<void>;
  cargarPublicadas: (token: string) => Promise<Actividad[]>;
  /** Llamada HTTP a la API de mensajes (inyectable para pruebas). */
  llamarModelo: (cuerpo: Record<string, unknown>, signal: AbortSignal) => Promise<Response>;
  limiteDiario: number;
  modelo: string;
  maxTokens?: number;
  registrar?: (mensaje: string, datos?: Record<string, unknown>) => void;
}

interface Peticion {
  pregunta: string;
  historial: MensajeChat[];
  fichasPrevias: string[] | null;
  continuar: boolean;
}

const MAX_CUERPO = 24 * 1024;

function json(estado: number, cuerpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export function validarPeticion(x: unknown): Peticion | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Record<string, unknown>;
  if (typeof p.pregunta !== 'string') return null;
  const pregunta = p.pregunta.trim();
  if (!pregunta || pregunta.length > 1500) return null;
  const historial: MensajeChat[] = [];
  if (p.historial !== undefined) {
    if (!Array.isArray(p.historial) || p.historial.length > 12) return null;
    for (const m of p.historial) {
      if (!m || typeof m !== 'object') return null;
      const { rol, texto } = m as Record<string, unknown>;
      if ((rol !== 'usuario' && rol !== 'asistente') || typeof texto !== 'string' || texto.length > 4000) return null;
      historial.push({ rol, texto });
    }
  }
  let fichasPrevias: string[] | null = null;
  if (p.fichasPrevias !== undefined && p.fichasPrevias !== null) {
    if (!Array.isArray(p.fichasPrevias) || p.fichasPrevias.length > 12 || !p.fichasPrevias.every((id) => typeof id === 'string' && /^[a-z0-9-]{1,80}$/.test(id))) return null;
    fichasPrevias = p.fichasPrevias as string[];
  }
  return { pregunta, historial, fichasPrevias, continuar: p.continuar === true };
}

// Caché breve del catálogo publicado (igual para todas las cuentas con acceso).
let cache: { hasta: number; datos: Actividad[] } | null = null;
export function _limpiarCache() {
  cache = null;
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

export async function manejarAsistente(req: Request, deps: DependenciasAsistente): Promise<Response> {
  if (req.method !== 'POST') return json(405, { codigo: 'metodo', mensaje: 'Método no permitido' });
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json(401, { codigo: 'sin-sesion', mensaje: 'Inicia sesión para usar el asistente.' });

  const usuario = await deps.verificarUsuario(token).catch(() => null);
  if (!usuario) return json(401, { codigo: 'sin-sesion', mensaje: 'La sesión no es válida o caducó.' });
  const acceso = await deps.estadoAcceso(token).catch(() => null);
  if (!acceso || (acceso.rol !== 'admin' && acceso.acceso !== 'activo')) return json(403, { codigo: 'sin-acceso', mensaje: 'Tu cuenta no tiene acceso activo.' });

  const texto = await req.text().catch(() => '');
  if (!texto || texto.length > MAX_CUERPO) return json(400, { codigo: 'peticion', mensaje: 'Petición no válida.' });
  let cuerpo: unknown;
  try {
    cuerpo = JSON.parse(texto);
  } catch {
    return json(400, { codigo: 'peticion', mensaje: 'Petición no válida.' });
  }
  const p = validarPeticion(cuerpo);
  if (!p) return json(400, { codigo: 'peticion', mensaje: 'Petición no válida.' });

  const restantes = await deps.consumirCuota(usuario.id, deps.limiteDiario).catch(() => null);
  if (restantes === null) return json(503, { codigo: 'servicio', mensaje: 'El asistente no está disponible en este momento.' });
  if (restantes < 0) return json(429, { codigo: 'limite', mensaje: `Alcanzaste el límite diario de ${deps.limiteDiario} consultas. Vuelve a intentarlo mañana.` });

  let publicadas: Actividad[];
  try {
    if (!cache || cache.hasta < Date.now()) cache = { hasta: Date.now() + 5 * 60_000, datos: await deps.cargarPublicadas(token) };
    publicadas = cache.datos.filter((a) => a.estado === 'publicado');
  } catch {
    return json(503, { codigo: 'servicio', mensaje: 'No se pudo consultar la biblioteca.' });
  }
  const porId = new Map(publicadas.map((a) => [a.id, a]));
  const fichas = p.fichasPrevias ? p.fichasPrevias.map((id) => porId.get(id)).filter((a): a is Actividad => !!a) : recuperarFichas(p.pregunta, publicadas, p.historial);
  const pregunta = p.continuar ? MENSAJE_CONTINUAR : p.pregunta;
  const mensajes = normalizarTurnos(construirMensajes(pregunta, fichas, p.historial));

  const abort = new AbortController();
  req.signal?.addEventListener('abort', () => abort.abort());
  const enc = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enviar = (evento: string, datos: Record<string, unknown>) => controller.enqueue(enc.encode(`event: ${evento}\ndata: ${JSON.stringify(datos)}\n\n`));
      enviar('meta', { fichas: fichas.map((a) => a.id), restantes });
      let entrada = 0;
      let salida = 0;
      let motivo: string | null = null;
      try {
        const r = await deps.llamarModelo(
          { model: deps.modelo, max_tokens: deps.maxTokens ?? 900, system: INSTRUCCIONES_SISTEMA, messages: mensajes, stream: true },
          abort.signal,
        );
        if (!r.ok || !r.body) {
          const codigo = r.status === 429 ? 'rate_limited' : r.status === 529 || r.status >= 500 ? 'proveedor' : 'proveedor';
          deps.registrar?.('Error del proveedor de IA', { estado: r.status });
          enviar('error', { codigo, mensaje: r.status === 429 ? 'El servicio de IA está saturado. Inténtalo en unos minutos.' : 'El servicio de IA no respondió correctamente.' });
          controller.close();
          return;
        }
        const lector = r.body.getReader();
        const dec = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await lector.read();
          if (done) break;
          buffer += dec.decode(value, { stream: true });
          let corte: number;
          while ((corte = buffer.indexOf('\n\n')) >= 0) {
            const bloque = buffer.slice(0, corte);
            buffer = buffer.slice(corte + 2);
            const datos = bloque
              .split('\n')
              .filter((l) => l.startsWith('data:'))
              .map((l) => l.slice(5).trim())
              .join('');
            if (!datos) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(datos);
            } catch {
              continue;
            }
            const tipo = ev.type;
            if (tipo === 'message_start') {
              const u = (ev.message as { usage?: { input_tokens?: number } } | undefined)?.usage;
              entrada = u?.input_tokens ?? 0;
            } else if (tipo === 'content_block_delta') {
              const d = ev.delta as { type?: string; text?: string } | undefined;
              if (d?.type === 'text_delta' && d.text) enviar('texto', { delta: d.text });
            } else if (tipo === 'message_delta') {
              motivo = (ev.delta as { stop_reason?: string } | undefined)?.stop_reason ?? motivo;
              salida = (ev.usage as { output_tokens?: number } | undefined)?.output_tokens ?? salida;
            } else if (tipo === 'error') {
              enviar('error', { codigo: 'proveedor', mensaje: 'El servicio de IA interrumpió la respuesta.' });
              controller.close();
              return;
            }
          }
        }
        enviar('fin', { truncada: motivo === 'max_tokens' });
      } catch (e) {
        if (abort.signal.aborted) enviar('error', { codigo: 'cancelado', mensaje: 'Respuesta detenida.' });
        else {
          deps.registrar?.('Fallo al llamar al modelo', { error: e instanceof Error ? e.message : String(e) });
          enviar('error', { codigo: 'proveedor', mensaje: 'No se pudo completar la respuesta.' });
        }
      }
      await deps.registrarTokens?.(usuario.id, entrada, salida).catch(() => undefined);
      controller.close();
    },
    cancel() {
      abort.abort();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
  });
}

/** Llamada real a la API de Anthropic (Messages API, streaming). */
export function llamarAnthropic(apiKey: string) {
  return (cuerpo: Record<string, unknown>, signal: AbortSignal) =>
    fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(cuerpo),
      signal,
    });
}
