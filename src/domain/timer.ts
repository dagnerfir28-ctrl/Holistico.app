import type { Actividad, EstadoFacilitacion } from './types';

/**
 * Temporizador de facilitación basado en marcas de tiempo (no en intervalos):
 * el tiempo transcurrido se calcula siempre como acumulado + (ahora − inicio del tramo),
 * así que es correcto aunque la pantalla se apague o la app pase a segundo plano.
 * Avanzar de fase o de paso SIEMPRE es una acción de la persona.
 */

export function claveFacilitacion(actividadId: string, retiroId?: string | null, bloqueId?: string | null): string {
  return retiroId && bloqueId ? `ret:${retiroId}:${bloqueId}` : `act:${actividadId}`;
}

export function crearEstado(actividadId: string, retiroId: string | null = null, bloqueId: string | null = null): EstadoFacilitacion {
  return {
    clave: claveFacilitacion(actividadId, retiroId, bloqueId),
    actividadId,
    retiroId,
    bloqueId,
    faseIndex: 0,
    pasoIndex: 0,
    corriendo: false,
    inicioSegmento: null,
    acumuladoFaseMs: 0,
    acumuladoTotalMs: 0,
    avisado: false,
    actualizado: new Date().toISOString(),
  };
}

function tramo(e: EstadoFacilitacion, ahora: number): number {
  return e.corriendo && e.inicioSegmento !== null ? Math.max(0, ahora - e.inicioSegmento) : 0;
}

export function transcurridoFase(e: EstadoFacilitacion, ahora: number): number {
  return e.acumuladoFaseMs + tramo(e, ahora);
}

export function transcurridoTotal(e: EstadoFacilitacion, ahora: number): number {
  return e.acumuladoTotalMs + tramo(e, ahora);
}

function sello(e: EstadoFacilitacion): EstadoFacilitacion {
  return { ...e, actualizado: new Date().toISOString() };
}

export function iniciar(e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  if (e.corriendo) return e;
  return sello({ ...e, corriendo: true, inicioSegmento: ahora });
}

export function pausar(e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  if (!e.corriendo) return e;
  const t = tramo(e, ahora);
  return sello({ ...e, corriendo: false, inicioSegmento: null, acumuladoFaseMs: e.acumuladoFaseMs + t, acumuladoTotalMs: e.acumuladoTotalMs + t });
}

/** Cierra el tramo en curso y, si sigue corriendo, abre uno nuevo desde `ahora`. */
function consolidar(e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  const t = tramo(e, ahora);
  return {
    ...e,
    acumuladoFaseMs: e.acumuladoFaseMs + t,
    acumuladoTotalMs: e.acumuladoTotalMs + t,
    inicioSegmento: e.corriendo ? ahora : null,
  };
}

export function irA(e: EstadoFacilitacion, faseIndex: number, pasoIndex: number, ahora: number): EstadoFacilitacion {
  const c = consolidar(e, ahora);
  const cambiaFase = faseIndex !== e.faseIndex;
  return sello({
    ...c,
    faseIndex,
    pasoIndex,
    acumuladoFaseMs: cambiaFase ? 0 : c.acumuladoFaseMs,
    avisado: cambiaFase ? false : c.avisado,
  });
}

export function totalPasos(a: Actividad, faseIndex: number): number {
  return Math.max(1, a.fases[faseIndex]?.pasos.length ?? 1);
}

export function esUltimo(a: Actividad, e: EstadoFacilitacion): boolean {
  return e.faseIndex >= a.fases.length - 1 && e.pasoIndex >= totalPasos(a, e.faseIndex) - 1;
}

export function esPrimero(e: EstadoFacilitacion): boolean {
  return e.faseIndex === 0 && e.pasoIndex === 0;
}

export function siguiente(a: Actividad, e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  if (e.pasoIndex < totalPasos(a, e.faseIndex) - 1) return irA(e, e.faseIndex, e.pasoIndex + 1, ahora);
  if (e.faseIndex < a.fases.length - 1) return irA(e, e.faseIndex + 1, 0, ahora);
  return e;
}

export function anterior(a: Actividad, e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  if (e.pasoIndex > 0) return irA(e, e.faseIndex, e.pasoIndex - 1, ahora);
  if (e.faseIndex > 0) return irA(e, e.faseIndex - 1, totalPasos(a, e.faseIndex - 1) - 1, ahora);
  return e;
}

export function reiniciarFase(e: EstadoFacilitacion, ahora: number): EstadoFacilitacion {
  const c = consolidar(e, ahora);
  return sello({ ...c, acumuladoFaseMs: 0, inicioSegmento: e.corriendo ? ahora : null, avisado: false });
}

/** Minutos previstos de la fase (límite superior del rango), o null si la fuente no indica tiempo. */
export function previstoFaseMs(a: Actividad, faseIndex: number): number | null {
  const t = a.fases[faseIndex]?.tiempo;
  return t ? t.max * 60_000 : null;
}

export function previstoTotal(a: Actividad): { min: number; max: number } | null {
  if (!a.fases.length || a.fases.some((f) => !f.tiempo)) return null;
  return {
    min: a.fases.reduce((s, f) => s + (f.tiempo?.min ?? 0), 0),
    max: a.fases.reduce((s, f) => s + (f.tiempo?.max ?? 0), 0),
  };
}
