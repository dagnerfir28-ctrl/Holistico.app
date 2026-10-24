import type { Actividad, Estado, Experiencia, Formato, Intensidad, Momento } from './types';
import { normalizar, tokens } from './text';
import { GRUPOS_MATERIAL, MATERIALES_BASICOS, MOMENTO_NOMBRE } from './labels';

export interface Filtros {
  texto: string;
  momentos: Momento[];
  tiempo: number | null; // minutos disponibles: la actividad encaja si su mínimo cabe
  formatos: Formato[];
  espacios: string[]; // interior | exterior | ambos | amplio
  materiales: string[]; // grupos de material o 'ninguno'
  intensidades: Intensidad[];
  experiencias: Experiencia[];
  soloFavoritas: boolean;
  estados: Estado[]; // solo administración
}

export const FILTROS_VACIOS: Filtros = {
  texto: '',
  momentos: [],
  tiempo: null,
  formatos: [],
  espacios: [],
  materiales: [],
  intensidades: [],
  experiencias: [],
  soloFavoritas: false,
  estados: [],
};

export function hayFiltros(f: Filtros): boolean {
  return (
    f.texto.trim() !== '' ||
    f.momentos.length > 0 ||
    f.tiempo !== null ||
    f.formatos.length > 0 ||
    f.espacios.length > 0 ||
    f.materiales.length > 0 ||
    f.intensidades.length > 0 ||
    f.experiencias.length > 0 ||
    f.soloFavoritas ||
    f.estados.length > 0
  );
}

export function contarFiltros(f: Filtros): number {
  return (
    (f.texto.trim() ? 1 : 0) +
    f.momentos.length +
    (f.tiempo !== null ? 1 : 0) +
    f.formatos.length +
    f.espacios.length +
    f.materiales.length +
    f.intensidades.length +
    f.experiencias.length +
    (f.soloFavoritas ? 1 : 0) +
    f.estados.length
  );
}

interface Indice {
  titulo: string;
  temas: string;
  resumen: string;
  cuerpo: string;
}

const cache = new WeakMap<Actividad, Indice>();

function indice(a: Actividad): Indice {
  let idx = cache.get(a);
  if (!idx) {
    idx = {
      titulo: normalizar(a.titulo),
      temas: normalizar([...a.temas, ...a.momentos.map((m) => MOMENTO_NOMBRE[m])].join(' ')),
      resumen: normalizar([a.subtitulo, a.resumen].join(' ')),
      cuerpo: normalizar(
        [
          a.objetivo,
          a.contexto,
          a.tipoFuente,
          ...a.materiales.map((m) => m.texto),
          ...a.fases.map((f) => f.nombre),
          ...a.secciones.map((s) => s.titulo),
        ].join(' '),
      ),
    };
    cache.set(a, idx);
  }
  return idx;
}

function contiene(campo: string, t: string): boolean {
  if (campo.includes(t)) return true;
  // Tolerancia a plurales simples: "meditaciones" ~ "meditacion"
  if (t.length > 4 && t.endsWith('es') && campo.includes(t.slice(0, -2))) return true;
  if (t.length > 3 && t.endsWith('s') && campo.includes(t.slice(0, -1))) return true;
  return false;
}

/** Puntúa una actividad para una consulta; 0 = no coincide (todas las palabras deben aparecer). */
export function puntuar(a: Actividad, consulta: string): number {
  const ts = tokens(consulta);
  if (ts.length === 0) return 1;
  const idx = indice(a);
  let total = 0;
  for (const t of ts) {
    let s = 0;
    if (contiene(idx.titulo, t)) s = Math.max(s, idx.titulo.startsWith(t) ? 12 : 9);
    if (contiene(idx.temas, t)) s = Math.max(s, 6);
    if (contiene(idx.resumen, t)) s = Math.max(s, 4);
    if (contiene(idx.cuerpo, t)) s = Math.max(s, 2);
    if (s === 0) return 0;
    total += s;
  }
  const frase = normalizar(consulta);
  if (frase.length > 3 && idx.titulo.includes(frase)) total += 10;
  return total;
}

function cumpleMateriales(a: Actividad, grupos: string[]): boolean {
  if (grupos.length === 0) return true;
  const ids = new Set(a.materiales.flatMap((m) => m.ids));
  return grupos.some((g) => {
    if (g === 'ninguno') return [...ids].every((id) => MATERIALES_BASICOS.has(id));
    const grupo = GRUPOS_MATERIAL.find((x) => x.id === g);
    return grupo ? grupo.ids.some((id) => ids.has(id)) : false;
  });
}

function cumpleEspacio(a: Actividad, espacios: string[]): boolean {
  if (espacios.length === 0) return true;
  return espacios.some((e) => {
    if (e === 'amplio') return !!a.espacio.amplio;
    if (e === 'ambos') return a.espacio.tipo === 'ambos';
    return a.espacio.tipo === e || a.espacio.tipo === 'ambos';
  });
}

export function filtrar(
  actividades: Actividad[],
  f: Filtros,
  favoritos: Record<string, string> = {},
): { actividad: Actividad; puntos: number }[] {
  const res: { actividad: Actividad; puntos: number }[] = [];
  for (const a of actividades) {
    if (f.estados.length && !f.estados.includes(a.estado)) continue;
    if (f.momentos.length && !f.momentos.some((m) => a.momentos.includes(m))) continue;
    if (f.tiempo !== null && (!a.duracion || a.duracion.min > f.tiempo)) continue;
    if (f.formatos.length && !f.formatos.some((x) => a.formato.includes(x))) continue;
    if (!cumpleEspacio(a, f.espacios)) continue;
    if (!cumpleMateriales(a, f.materiales)) continue;
    if (f.intensidades.length && !f.intensidades.includes(a.intensidad)) continue;
    if (f.experiencias.length && !f.experiencias.includes(a.experiencia)) continue;
    if (f.soloFavoritas && !favoritos[a.id]) continue;
    const puntos = puntuar(a, f.texto);
    if (puntos === 0) continue;
    res.push({ actividad: a, puntos });
  }
  const conTexto = f.texto.trim() !== '';
  res.sort((x, y) => (conTexto ? y.puntos - x.puntos : 0) || x.actividad.titulo.localeCompare(y.actividad.titulo, 'es'));
  return res;
}

export const OPCIONES_TIEMPO = [
  { valor: 30, nombre: 'Hasta 30 min' },
  { valor: 45, nombre: 'Hasta 45 min' },
  { valor: 60, nombre: 'Hasta 1 hora' },
  { valor: 90, nombre: 'Hasta 1 h 30' },
  { valor: 120, nombre: 'Hasta 2 horas' },
];
