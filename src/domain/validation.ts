import type { Actividad } from './types';

export interface Problema {
  campo: string;
  mensaje: string;
  bloquea: boolean; // impide publicar
}

/** Revisa una actividad. Los problemas que "bloquean" impiden publicarla. */
export function revisarActividad(a: Actividad, todas: Actividad[] = []): Problema[] {
  const p: Problema[] = [];
  const add = (campo: string, mensaje: string, bloquea = false) => p.push({ campo, mensaje, bloquea });
  if (!a.titulo.trim()) add('titulo', 'Falta el título.', true);
  if (!a.resumen?.trim() && !a.subtitulo?.trim()) add('resumen', 'Falta un resumen o subtítulo para la tarjeta.', true);
  if (!a.objetivo?.trim()) add('objetivo', a.contexto ? 'Sin objetivo explícito (se muestra la apertura de contexto).' : 'Falta el objetivo.', !a.contexto);
  if (!a.momentos.length) add('momentos', 'Indica al menos un momento del retiro.', true);
  if (!a.formato.length) add('formato', 'Indica el formato (individual, parejas o grupo).', true);
  if (!a.duracion) add('duracion', 'Falta la duración prevista.', true);
  if (!a.fases.length) add('fases', 'Faltan las fases del desarrollo.', true);
  a.fases.forEach((f, i) => {
    if (!f.nombre.trim()) add(`fases.${i}`, `La fase ${i + 1} no tiene nombre.`, true);
    if (!f.tiempo) add(`fases.${i}`, `La fase «${f.nombre || i + 1}» no tiene tiempo.`, true);
    if (!f.pasos.some((s) => s.trim())) add(`fases.${i}`, `La fase «${f.nombre || i + 1}» no tiene instrucciones.`, true);
  });
  if (!a.materiales.length) add('materiales', 'Sin lista de materiales.');
  if (!a.consentimiento.length) add('consentimiento', 'Sin opciones de participación (pasar, observar, detenerse).', true);
  if (a.duracion && a.fases.length && a.fases.every((f) => f.tiempo)) {
    const lo = a.fases.reduce((s, f) => s + (f.tiempo?.min ?? 0), 0);
    const hi = a.fases.reduce((s, f) => s + (f.tiempo?.max ?? 0), 0);
    if (hi < a.duracion.min || lo > a.duracion.max) {
      add('duracion', `Las fases suman ${lo}–${hi} min y la duración indicada es ${a.duracion.min}–${a.duracion.max} min.`);
    }
  }
  if (a.duracion && a.duracion.min > a.duracion.max) add('duracion', 'La duración mínima es mayor que la máxima.', true);
  const retenidos = [...a.preparacion, ...a.recomendaciones].filter((x) => x.retenido).length;
  if (retenidos) add('recomendaciones', `${retenidos} texto(s) retenido(s) pendiente(s) de aprobación (no se muestran a compradoras).`);
  if (a.propuestas.length) add('propuestas', `${a.propuestas.length} propuesta(s) editorial(es) por revisar.`);
  for (const r of a.relacionadas) if (todas.length && !todas.some((x) => x.id === r)) add('relacionadas', `La actividad relacionada «${r}» no existe.`);
  return p;
}

export function puedePublicar(a: Actividad, todas: Actividad[] = []): boolean {
  return !revisarActividad(a, todas).some((x) => x.bloquea);
}

/** Similitud aproximada entre dos actividades (para detectar duplicados potenciales). */
export function similitud(a: Actividad, b: Actividad): number {
  const palabras = (x: Actividad) =>
    new Set(
      [x.titulo, x.subtitulo, x.objetivo, ...x.fases.flatMap((f) => f.pasos)]
        .join(' ')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^a-zñ]+/)
        .filter((w) => w.length > 4),
    );
  const A = palabras(a);
  const B = palabras(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

export function duplicadosPotenciales(todas: Actividad[], umbral = 0.33): { a: Actividad; b: Actividad; s: number }[] {
  const out: { a: Actividad; b: Actividad; s: number }[] = [];
  const activas = todas.filter((x) => x.estado !== 'archivado');
  for (let i = 0; i < activas.length; i++)
    for (let j = i + 1; j < activas.length; j++) {
      const s = similitud(activas[i], activas[j]);
      if (s >= umbral) out.push({ a: activas[i], b: activas[j], s });
    }
  return out.sort((x, y) => y.s - x.s);
}
