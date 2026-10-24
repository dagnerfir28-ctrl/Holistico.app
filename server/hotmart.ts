/**
 * Webhook de Hotmart (formato 2.0.0) — lógica independiente de la plataforma de hosting.
 *  - Autentica con el hottok enviado en la cabecera X-HOTMART-HOTTOK (comparación en tiempo constante).
 *  - Valida la forma del evento y delega el procesamiento idempotente en la base de datos
 *    (función procesar_evento_hotmart: un mismo id de evento nunca se aplica dos veces).
 *  - Solo los productos configurados desbloquean la app (los adicionales no).
 * IMPORTANTE: verificar contra la documentación vigente de Hotmart antes de activar en producción.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export interface ResultadoEvento {
  resultado: 'aplicado' | 'duplicado' | 'ignorado' | 'atrasado' | 'sin-cambio';
  estado?: string;
  email?: string;
  invitar?: boolean;
  motivo?: string;
}

export interface DependenciasHotmart {
  hottokEsperado: string;
  productos: string[];
  procesar: (evento: EventoHotmart, productos: string[]) => Promise<ResultadoEvento>;
  /** Envío opcional del correo de acceso (enlace de inicio de sesión). */
  invitar?: (email: string) => Promise<void>;
  marcarInvitacion?: (email: string) => Promise<void>;
  registrar?: (mensaje: string, datos?: Record<string, unknown>) => void;
}

export interface EventoHotmart {
  id: string;
  event: string;
  version: string;
  creation_date?: number;
  data: {
    product?: { id?: number | string };
    buyer?: { email?: string };
    purchase?: { transaction?: string; status?: string };
  };
}

const TAMANO_MAXIMO = 256 * 1024;

function respuesta(estado: number, cuerpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export function hottokValido(recibido: string | null, esperado: string): boolean {
  if (!recibido || !esperado) return false;
  const a = createHash('sha256').update(recibido).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

export function validarEvento(x: unknown): EventoHotmart | null {
  if (!x || typeof x !== 'object') return null;
  const e = x as Record<string, unknown>;
  if (typeof e.id !== 'string' || !e.id || e.id.length > 120) return null;
  if (typeof e.event !== 'string' || !/^[A-Z_]{3,60}$/.test(e.event)) return null;
  if (typeof e.version !== 'string' || !e.version.startsWith('2.')) return null;
  if (!e.data || typeof e.data !== 'object') return null;
  if (e.creation_date !== undefined && typeof e.creation_date !== 'number') return null;
  return e as unknown as EventoHotmart;
}

/** Copia mínima del evento para la base de datos (sin datos de pago ni dirección). */
export function eventoMinimo(e: EventoHotmart): EventoHotmart {
  return {
    id: e.id,
    event: e.event,
    version: e.version,
    creation_date: e.creation_date,
    data: {
      product: { id: e.data.product?.id !== undefined ? String(e.data.product.id) : undefined },
      buyer: { email: typeof e.data.buyer?.email === 'string' ? e.data.buyer.email.slice(0, 254) : undefined },
      purchase: { transaction: e.data.purchase?.transaction?.slice(0, 80), status: e.data.purchase?.status?.slice(0, 40) },
    },
  };
}

export async function manejarWebhookHotmart(req: Request, deps: DependenciasHotmart): Promise<Response> {
  if (req.method !== 'POST') return respuesta(405, { ok: false, error: 'Método no permitido' });
  if (!deps.hottokEsperado || deps.productos.length === 0) {
    deps.registrar?.('Webhook sin configurar (HOTMART_HOTTOK o HOTMART_PRODUCT_IDS)');
    return respuesta(503, { ok: false, error: 'Servicio no configurado' });
  }
  if (!hottokValido(req.headers.get('x-hotmart-hottok'), deps.hottokEsperado)) {
    deps.registrar?.('Webhook rechazado: hottok ausente o incorrecto');
    return respuesta(401, { ok: false, error: 'No autorizado' });
  }
  const largo = Number(req.headers.get('content-length') ?? '0');
  if (largo > TAMANO_MAXIMO) return respuesta(413, { ok: false, error: 'Cuerpo demasiado grande' });
  let texto: string;
  try {
    texto = await req.text();
  } catch {
    return respuesta(400, { ok: false, error: 'Cuerpo ilegible' });
  }
  if (texto.length > TAMANO_MAXIMO) return respuesta(413, { ok: false, error: 'Cuerpo demasiado grande' });
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch {
    return respuesta(400, { ok: false, error: 'JSON no válido' });
  }
  const evento = validarEvento(json);
  if (!evento) return respuesta(400, { ok: false, error: 'Evento no válido' });

  let r: ResultadoEvento;
  try {
    r = await deps.procesar(eventoMinimo(evento), deps.productos);
  } catch (e) {
    // 5xx: Hotmart reintentará; el procesamiento es idempotente.
    deps.registrar?.('Error al procesar el evento', { id: evento.id, tipo: evento.event, error: e instanceof Error ? e.message : String(e) });
    return respuesta(500, { ok: false, error: 'Error interno' });
  }
  deps.registrar?.('Evento procesado', { id: evento.id, tipo: evento.event, resultado: r.resultado, estado: r.estado });

  if (r.resultado === 'aplicado' && r.invitar && r.email && deps.invitar) {
    try {
      await deps.invitar(r.email);
      await deps.marcarInvitacion?.(r.email);
    } catch (e) {
      // La compradora puede entrar igualmente con su correo desde la pantalla de acceso.
      deps.registrar?.('No se pudo enviar el correo de acceso', { id: evento.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return respuesta(200, { ok: true, resultado: r.resultado });
}
