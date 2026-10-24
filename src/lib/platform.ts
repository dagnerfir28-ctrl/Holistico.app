/**
 * Diferencias entre destinos:
 *  - web: hosting propio. Impresión con window.print() y descargas con Blob.
 *  - artifact: vista previa privada en claude.ai. window.print() no hace nada y los enlaces de descarga
 *    están desactivados, así que se usan las capacidades del visor (downloads, sample).
 */
import { ES_ARTIFACT } from '../config/env';

export interface SampleResultado {
  text: string;
  truncated: boolean;
}
export interface SampleError {
  code: string;
  message: string;
  text?: string;
}
export type SampleFn = (
  input: string | { role: 'user' | 'assistant'; content: string }[],
  options?: {
    onText?: (u: { text: string; delta: string }) => void;
    signal?: AbortSignal;
    modelTier?: 'quick' | 'default' | 'complex';
    cache?: boolean;
  },
) => Promise<SampleResultado>;

interface Descargas {
  save(req: { filename: string; data: string | Blob }): Promise<{ status: 'saved' | 'delivered' }>;
}

interface ClaudeVisor {
  use(nombre: string): Promise<unknown>;
}

function visor(): ClaudeVisor | null {
  const w = window as unknown as { claude?: ClaudeVisor };
  return ES_ARTIFACT && w.claude && typeof w.claude.use === 'function' ? w.claude : null;
}

let promesaSample: Promise<SampleFn | null> | null = null;
/** Función para consultar a Claude desde la vista previa (null si no está disponible). */
export function obtenerSample(): Promise<SampleFn | null> {
  const v = visor();
  if (!v) return Promise.resolve(null);
  promesaSample ??= v.use('sample').then((x) => (typeof x === 'function' ? (x as SampleFn) : null)).catch(() => null);
  return promesaSample;
}

let promesaDescargas: Promise<Descargas | null> | null = null;
function obtenerDescargas(): Promise<Descargas | null> {
  const v = visor();
  if (!v) return Promise.resolve(null);
  promesaDescargas ??= v.use('downloads').then((x) => (x && typeof (x as Descargas).save === 'function' ? (x as Descargas) : null)).catch(() => null);
  return promesaDescargas;
}

export const PUEDE_IMPRIMIR = !ES_ARTIFACT && typeof window !== 'undefined' && typeof window.print === 'function';

export type ResultadoDescarga = 'guardado' | 'cancelado' | 'no-disponible' | 'error';

/** Ofrece un archivo para guardar. En la vista previa, el visor pide confirmación a la persona. */
export async function guardarArchivo(nombre: string, contenido: string, tipo: string): Promise<ResultadoDescarga> {
  if (ES_ARTIFACT) {
    const d = await obtenerDescargas();
    if (!d) return 'no-disponible';
    try {
      await d.save({ filename: nombre, data: contenido });
      return 'guardado';
    } catch (e) {
      const code = (e as { code?: string })?.code;
      return code === 'declined' ? 'cancelado' : 'error';
    }
  }
  try {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return 'guardado';
  } catch {
    return 'error';
  }
}

export function nombreArchivo(base: string, ext: string): string {
  const limpio = base
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return `${limpio || 'retiros-holisticos'}.${ext}`;
}

/** Mantiene la pantalla encendida mientras se facilita (si el navegador lo permite). */
export async function pedirPantallaActiva(): Promise<(() => void) | null> {
  const nav = navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } };
  if (!nav.wakeLock) return null;
  try {
    const lock = await nav.wakeLock.request('screen');
    return () => {
      lock.release().catch(() => undefined);
    };
  } catch {
    return null;
  }
}

/** Campana suave generada en el navegador (solo si la persona activa los sonidos). */
export function sonarCampana() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const ahora = ctx.currentTime;
    [528, 792].forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ahora);
      gain.gain.exponentialRampToValueAtTime(i === 0 ? 0.18 : 0.06, ahora + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ahora + 2.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ahora);
      osc.stop(ahora + 2.7);
    });
    setTimeout(() => ctx.close().catch(() => undefined), 3000);
  } catch {
    /* sin sonido */
  }
}
