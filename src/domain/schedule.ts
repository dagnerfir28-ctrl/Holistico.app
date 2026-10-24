import type { Actividad, Bloque, Jornada, Retiro } from './types';
import { aHora, aMinutos } from './time';

export type AvisoTipo = 'solapamiento' | 'exceso' | 'hueco' | 'hora-invalida' | 'sin-duracion';

export interface Aviso {
  tipo: AvisoTipo;
  bloqueId?: string;
  mensaje: string;
  minutos?: number;
}

export interface BloqueProgramado {
  bloque: Bloque;
  inicio: number; // minutos desde 00:00
  fin: number;
  inicioTexto: string;
  finTexto: string;
  solapa: boolean;
  fueraDeHorario: boolean;
}

export interface JornadaProgramada {
  jornada: Jornada;
  bloques: BloqueProgramado[];
  inicio: number | null;
  fin: number | null; // fin calculado del último bloque
  disponible: number | null; // minutos entre inicio y fin de jornada
  ocupado: number; // suma de duraciones
  avisos: Aviso[];
}

export function tituloBloque(b: Bloque, catalogo: Map<string, Actividad>): string {
  if (b.tipo === 'actividad') return catalogo.get(b.actividadId)?.titulo ?? 'Actividad no disponible';
  return b.titulo || (b.tipo === 'pausa' ? 'Pausa' : 'Bloque propio');
}

/** Calcula horarios, solapamientos y excesos de tiempo de una jornada. */
export function programarJornada(j: Jornada, catalogo: Map<string, Actividad>): JornadaProgramada {
  const avisos: Aviso[] = [];
  const inicio = aMinutos(j.inicio);
  const finJornada = aMinutos(j.fin);
  if (inicio === null) {
    avisos.push({ tipo: 'hora-invalida', mensaje: 'La hora de inicio de la jornada no es válida (usa el formato HH:MM).' });
  }
  let t = inicio ?? 0;
  const bloques: BloqueProgramado[] = [];
  let ocupado = 0;
  for (const b of j.bloques) {
    const dur = Math.max(0, Math.round(b.duracion || 0));
    if (!dur) {
      avisos.push({ tipo: 'sin-duracion', bloqueId: b.id, mensaje: `«${tituloBloque(b, catalogo)}» no tiene duración.` });
    }
    let start = t;
    let solapa = false;
    if (b.horaFija) {
      const fija = aMinutos(b.horaFija);
      if (fija === null) {
        avisos.push({ tipo: 'hora-invalida', bloqueId: b.id, mensaje: `La hora fija de «${tituloBloque(b, catalogo)}» no es válida.` });
      } else {
        if (fija < t) {
          solapa = true;
          avisos.push({
            tipo: 'solapamiento',
            bloqueId: b.id,
            minutos: t - fija,
            mensaje: `«${tituloBloque(b, catalogo)}» empieza a las ${aHora(fija)}, pero el bloque anterior termina a las ${aHora(t)} (solapamiento de ${t - fija} min).`,
          });
        } else if (fija > t && bloques.length > 0) {
          avisos.push({ tipo: 'hueco', bloqueId: b.id, minutos: fija - t, mensaje: `Hay ${fija - t} min libres antes de «${tituloBloque(b, catalogo)}».` });
        }
        start = fija;
      }
    }
    const end = start + dur;
    ocupado += dur;
    const fueraDeHorario = finJornada !== null && end > finJornada;
    bloques.push({ bloque: b, inicio: start, fin: end, inicioTexto: aHora(start), finTexto: aHora(end), solapa, fueraDeHorario });
    t = Math.max(t, end);
  }
  const finCalc = bloques.length ? Math.max(...bloques.map((x) => x.fin)) : inicio;
  if (finJornada !== null && finCalc !== null && finCalc > finJornada) {
    avisos.push({
      tipo: 'exceso',
      minutos: finCalc - finJornada,
      mensaje: `La jornada termina a las ${aHora(finCalc)}: ${finCalc - finJornada} min después del fin previsto (${aHora(finJornada)}).`,
    });
  }
  const disponible = inicio !== null && finJornada !== null ? Math.max(0, finJornada - inicio) : null;
  return { jornada: j, bloques, inicio, fin: finCalc ?? null, disponible, ocupado, avisos };
}

export function programarRetiro(r: Retiro, catalogo: Map<string, Actividad>) {
  const jornadas = r.jornadas.map((j) => programarJornada(j, catalogo));
  const total = jornadas.reduce((s, j) => s + j.ocupado, 0);
  const actividades = r.jornadas.reduce((s, j) => s + j.bloques.filter((b) => b.tipo === 'actividad').length, 0);
  const avisos = jornadas.flatMap((j) => j.avisos);
  return { jornadas, total, actividades, avisos };
}
