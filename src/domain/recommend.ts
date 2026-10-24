import type { Actividad, Formato, Intensidad, Momento } from './types';
import { INTENSIDAD_NIVEL, MOMENTO_NOMBRE } from './labels';
import { formatoRango } from './time';

export interface PeticionRecomendacion {
  momento: Momento | null;
  minutos: number | null;
  participantes: number | null;
  experienciaGrupo: 'principiante' | 'mixto' | 'experimentado' | null;
  formato: Formato | null;
  espacio: 'interior' | 'exterior' | null;
  intensidadMaxima: Intensidad | null;
}

export interface Recomendacion {
  actividad: Actividad;
  puntos: number;
  razones: string[];
  advertencias: string[];
}

/** Recomendador determinista (sin IA): filtra y ordena actividades publicadas según el contexto. */
export function recomendar(actividades: Actividad[], p: PeticionRecomendacion, limite = 6): Recomendacion[] {
  const out: Recomendacion[] = [];
  for (const a of actividades) {
    const razones: string[] = [];
    const advertencias: string[] = [];
    let puntos = 0;
    if (p.momento) {
      if (!a.momentos.includes(p.momento)) continue;
      puntos += a.momentos[0] === p.momento ? 6 : 4;
      razones.push(`Encaja en ${MOMENTO_NOMBRE[p.momento].toLowerCase()}`);
    }
    if (p.minutos !== null) {
      if (!a.duracion || a.duracion.min > p.minutos) continue;
      puntos += a.duracion.max <= p.minutos ? 4 : 2;
      razones.push(`${formatoRango(a.duracion)}${a.duracion.max > p.minutos ? ' (ajusta los tiempos para que quepa)' : ''}`);
    }
    if (p.formato) {
      if (!a.formato.includes(p.formato)) continue;
      puntos += 2;
    }
    if (p.espacio) {
      if (a.espacio.tipo !== p.espacio && a.espacio.tipo !== 'ambos') continue;
      puntos += 1;
    }
    const maxNivel = p.intensidadMaxima ? INTENSIDAD_NIVEL[p.intensidadMaxima] : p.experienciaGrupo === 'principiante' ? 2 : 3;
    if (INTENSIDAD_NIVEL[a.intensidad] > maxNivel) continue;
    if (p.experienciaGrupo === 'principiante') {
      puntos += a.intensidad === 'suave' ? 3 : 0;
      if (a.experiencia === 'avanzada') advertencias.push('Requiere experiencia avanzada de quien facilita.');
    }
    if (p.participantes !== null && p.participantes > 0) {
      if (a.formato.includes('parejas') && p.participantes % 2 === 1) advertencias.push('Grupo impar: prevé un trío o que alguien acompañe como observador.');
      if (p.participantes > 20 && a.formato.length === 1 && a.formato[0] === 'grupo' && /c[ií]rculo/i.test(a.tipoFuente ?? '')) {
        advertencias.push('Con más de 20 personas, un círculo de palabra puede alargarse: considera subgrupos o turnos breves.');
      }
    }
    if (a.intensidad === 'suave') razones.push('Intensidad suave');
    out.push({ actividad: a, puntos, razones, advertencias });
  }
  out.sort((x, y) => y.puntos - x.puntos || x.actividad.titulo.localeCompare(y.actividad.titulo, 'es'));
  return out.slice(0, limite);
}
