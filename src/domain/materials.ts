import type { Actividad, Catalogo, Origen, Retiro } from './types';
import { actividadesDelRetiro } from './retreats';

export function hashTexto(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

export interface MaterialConsolidado {
  clave: string;
  id: string;
  nombre: string;
  opcionalEnTodas: boolean;
  usos: { actividadId: string; titulo: string; textos: string[]; opcional: boolean }[];
}

export interface PreparacionConsolidada {
  materiales: MaterialConsolidado[];
  otros: { clave: string; texto: string; actividad: string }[]; // materiales sin equivalencia canónica
  ambiente: { clave: string; texto: string; actividades: string[] }[];
  preparaciones: { clave: string; texto: string; origen: Origen; actividadId: string; titulo: string }[];
  recordatorios: { clave: string; texto: string; origen: Origen; actividades: string[]; tipo: 'consentimiento' | 'pausa' | 'evitar' }[];
  sinListaMateriales: { id: string; titulo: string }[];
  actividadesNoDisponibles: string[];
}

/** Consolida materiales, preparación y recordatorios de las actividades de un retiro.
 *  No inventa cantidades: solo agrupa lo que indica cada ficha. */
export function consolidarPreparacion(retiro: Retiro, catalogo: Catalogo, porId: Map<string, Actividad>): PreparacionConsolidada {
  const nombres = new Map(catalogo.materialesCanonicos.map((m) => [m.id, m.nombre]));
  const mats = new Map<string, MaterialConsolidado>();
  const otros: PreparacionConsolidada['otros'] = [];
  const ambiente = new Map<string, { clave: string; texto: string; actividades: string[] }>();
  const preparaciones: PreparacionConsolidada['preparaciones'] = [];
  const recordatorios = new Map<string, PreparacionConsolidada['recordatorios'][number]>();
  const sinLista: { id: string; titulo: string }[] = [];
  const noDisponibles: string[] = [];

  for (const id of actividadesDelRetiro(retiro)) {
    const a = porId.get(id);
    if (!a) {
      noDisponibles.push(id);
      continue;
    }
    if (a.materiales.length === 0) sinLista.push({ id: a.id, titulo: a.titulo });
    for (const m of a.materiales) {
      if (m.ids.length === 0) {
        // Requisitos de ambiente/espacio expresados como material: ya figuran en `ambiente`.
        // Si no están allí (p. ej., actividad creada en administración), se listan aparte.
        if (!a.ambiente.includes(m.texto)) otros.push({ clave: `otro:${a.id}:${hashTexto(m.texto)}`, texto: m.texto, actividad: a.titulo });
        continue;
      }
      for (const mid of m.ids) {
        const clave = `mat:${mid}`;
        let c = mats.get(mid);
        if (!c) {
          c = { clave, id: mid, nombre: nombres.get(mid) ?? mid, opcionalEnTodas: true, usos: [] };
          mats.set(mid, c);
        }
        let uso = c.usos.find((u) => u.actividadId === a.id);
        if (!uso) {
          uso = { actividadId: a.id, titulo: a.titulo, textos: [], opcional: m.opcional };
          c.usos.push(uso);
        } else {
          uso.opcional = uso.opcional && m.opcional;
        }
        if (!uso.textos.includes(m.texto)) uso.textos.push(m.texto);
        if (!m.opcional) c.opcionalEnTodas = false;
      }
    }
    for (const t of a.ambiente) {
      const clave = `amb:${hashTexto(t)}`;
      const e = ambiente.get(clave) ?? { clave, texto: t, actividades: [] };
      if (!e.actividades.includes(a.titulo)) e.actividades.push(a.titulo);
      ambiente.set(clave, e);
    }
    for (const p of a.preparacion) {
      if (p.retenido) continue;
      preparaciones.push({ clave: `prep:${a.id}:${hashTexto(p.texto)}`, texto: p.texto, origen: p.origen, actividadId: a.id, titulo: a.titulo });
    }
    const add = (tipo: 'consentimiento' | 'pausa' | 'evitar', texto: string, origen: Origen) => {
      const clave = `rec:${tipo}:${hashTexto(texto)}`;
      const r = recordatorios.get(clave) ?? { clave, texto, origen, actividades: [], tipo };
      if (!r.actividades.includes(a.titulo)) r.actividades.push(a.titulo);
      recordatorios.set(clave, r);
    };
    a.consentimiento.forEach((c) => add('consentimiento', c.texto, c.origen));
    a.criteriosPausa.forEach((c) => add('pausa', c.texto, c.origen));
    a.cuandoEvitar.forEach((c) => add('evitar', `${a.titulo}: ${c.texto}`, c.origen));
  }
  const orden = catalogo.materialesCanonicos.map((m) => m.id);
  return {
    materiales: [...mats.values()].sort((x, y) => orden.indexOf(x.id) - orden.indexOf(y.id)),
    otros,
    ambiente: [...ambiente.values()],
    preparaciones,
    recordatorios: [...recordatorios.values()].sort((x, y) => x.tipo.localeCompare(y.tipo)),
    sinListaMateriales: sinLista,
    actividadesNoDisponibles: noDisponibles,
  };
}
