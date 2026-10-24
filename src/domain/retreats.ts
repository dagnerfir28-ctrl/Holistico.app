import type { Actividad, Bloque, BloqueActividad, BloqueLibre, Jornada, Retiro } from './types';
import { nuevoId } from './text';

export function nuevaJornada(n: number): Jornada {
  return { id: nuevoId('jor'), nombre: n === 1 ? 'Jornada 1' : `Jornada ${n}`, fecha: null, inicio: '09:00', fin: null, bloques: [] };
}

export function nuevoRetiro(nombre = 'Nuevo retiro'): Retiro {
  const ahora = new Date().toISOString();
  return {
    id: nuevoId('ret'),
    nombre,
    objetivo: '',
    fecha: null,
    duracionPrevista: '',
    participantes: null,
    contexto: '',
    notas: '',
    jornadas: [nuevaJornada(1)],
    checklist: {},
    checklistPropios: [],
    offline: null,
    creado: ahora,
    actualizado: ahora,
    eliminado: null,
  };
}

/** Duración planificada por defecto: el máximo del rango de la fuente (deja margen). */
export function duracionPorDefecto(a: Actividad | undefined): number {
  if (!a?.duracion) return 30;
  return a.duracion.max;
}

export function bloqueDeActividad(a: Actividad): BloqueActividad {
  return { id: nuevoId('blq'), tipo: 'actividad', actividadId: a.id, duracion: duracionPorDefecto(a), duracionAdaptada: false, horaFija: null, nota: '' };
}

export function bloqueLibre(tipo: 'pausa' | 'propio', titulo?: string, duracion = 15): BloqueLibre {
  return { id: nuevoId('blq'), tipo, titulo: titulo ?? (tipo === 'pausa' ? 'Pausa' : 'Bloque propio'), duracion, horaFija: null, nota: '' };
}

export function tocar(r: Retiro): Retiro {
  return { ...r, actualizado: new Date().toISOString() };
}

export function duplicarRetiro(r: Retiro): Retiro {
  const copia: Retiro = JSON.parse(JSON.stringify(r));
  const ahora = new Date().toISOString();
  copia.id = nuevoId('ret');
  copia.nombre = `${r.nombre} (copia)`;
  copia.creado = ahora;
  copia.actualizado = ahora;
  copia.eliminado = null;
  copia.offline = null;
  copia.jornadas = copia.jornadas.map((j) => ({ ...j, id: nuevoId('jor'), bloques: j.bloques.map((b) => ({ ...b, id: nuevoId('blq') })) }));
  copia.checklist = {};
  copia.checklistPropios = copia.checklistPropios.map((c) => ({ ...c, id: nuevoId('chk'), hecho: false }));
  return copia;
}

export function moverEnLista<T>(lista: T[], desde: number, hasta: number): T[] {
  if (desde === hasta || desde < 0 || desde >= lista.length) return lista;
  const copia = lista.slice();
  const [x] = copia.splice(desde, 1);
  const destino = Math.max(0, Math.min(copia.length, hasta));
  copia.splice(destino, 0, x);
  return copia;
}

export function actualizarJornada(r: Retiro, jornadaId: string, fn: (j: Jornada) => Jornada): Retiro {
  return tocar({ ...r, jornadas: r.jornadas.map((j) => (j.id === jornadaId ? fn(j) : j)) });
}

export function actualizarBloque(r: Retiro, jornadaId: string, bloqueId: string, cambios: Partial<Bloque>): Retiro {
  return actualizarJornada(r, jornadaId, (j) => ({
    ...j,
    bloques: j.bloques.map((b) => (b.id === bloqueId ? ({ ...b, ...cambios } as Bloque) : b)),
  }));
}

export function moverBloqueAJornada(r: Retiro, desdeJornada: string, bloqueId: string, haciaJornada: string): Retiro {
  if (desdeJornada === haciaJornada) return r;
  const origen = r.jornadas.find((j) => j.id === desdeJornada);
  const bloque = origen?.bloques.find((b) => b.id === bloqueId);
  if (!bloque) return r;
  return tocar({
    ...r,
    jornadas: r.jornadas.map((j) => {
      if (j.id === desdeJornada) return { ...j, bloques: j.bloques.filter((b) => b.id !== bloqueId) };
      if (j.id === haciaJornada) return { ...j, bloques: [...j.bloques, bloque] };
      return j;
    }),
  });
}

export function actividadesDelRetiro(r: Retiro): string[] {
  const ids: string[] = [];
  for (const j of r.jornadas) for (const b of j.bloques) if (b.tipo === 'actividad' && !ids.includes(b.actividadId)) ids.push(b.actividadId);
  return ids;
}
