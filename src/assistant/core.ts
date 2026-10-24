/**
 * Núcleo del asistente (compartido por el cliente y el backend):
 * recuperación determinista de fichas publicadas + construcción del prompt + validación de citas.
 */
import type { Actividad, Momento } from '../domain/types';
import { normalizar, tokens } from '../domain/text';
import { puntuar } from '../domain/search';
import { EXPERIENCIA_NOMBRE, FORMATO_NOMBRE, INTENSIDAD_NOMBRE, MOMENTO_NOMBRE } from '../domain/labels';
import { formatoRango } from '../domain/time';

export interface MensajeChat {
  rol: 'usuario' | 'asistente';
  texto: string;
}

export interface Pistas {
  momentos: Momento[];
  minutos: number | null;
  participantes: number | null;
  principiantes: boolean;
  programa: boolean;
}

const PALABRAS_GENERICAS = new Set(['dinamica', 'dinamicas', 'actividad', 'actividades', 'retiro', 'retiros', 'quiero', 'necesito', 'usar', 'uso', 'puedo', 'hacer', 'grupo', 'personas', 'minutos', 'minuto', 'horas', 'hora', 'como', 'cual', 'cuales', 'que', 'recomiendas', 'recomienda', 'sugiere', 'sugieres', 'algo', 'mas', 'muy', 'facilitar', 'facilito', 'participantes', 'adultos', 'dias', 'dia', 'programa', 'arma', 'armar']);

export function extraerPistas(pregunta: string): Pistas {
  const n = normalizar(pregunta);
  const momentos: Momento[] = [];
  const add = (m: Momento) => !momentos.includes(m) && momentos.push(m);
  if (/\b(abrir|apertura|inicio|iniciar|comenzar|empezar|llegada|romper el hielo|primer)/.test(n)) add('apertura');
  if (/\b(conectar|conexion|vinculo|confianza|unir|cohesion)/.test(n)) add('conexion');
  if (/\b(cerrar|cierre|despedida|despedir|final|terminar)/.test(n)) add('cierre');
  if (/\b(integrar|integracion|anclar|asimilar)/.test(n)) add('integracion');
  if (/\b(reflexion|introspeccion|explorar|emocional|emociones|profund)/.test(n)) add('exploracion');
  let minutos: number | null = null;
  const mMin = /(\d{1,3})\s*(min|minutos)/.exec(n);
  const mHoras = /(\d{1,2})\s*(h|hora|horas)\b/.exec(n);
  if (mMin) minutos = Number(mMin[1]);
  else if (/media hora/.test(n)) minutos = 30;
  else if (/una hora/.test(n)) minutos = 60;
  else if (mHoras) minutos = Number(mHoras[1]) * 60;
  const mPart = /(\d{1,3})\s*(personas|participantes|adultos|mujeres|hombres|integrantes)/.exec(n);
  const participantes = mPart ? Number(mPart[1]) : null;
  const principiantes = /principiante|primera vez|sin experiencia|nuevos/.test(n);
  const programa = /programa|agenda|cronograma|\d\s*dias|fin de semana|jornada completa/.test(n);
  return { momentos, minutos, participantes, principiantes, programa };
}

/** Selecciona las fichas más relevantes para la pregunta (solo fichas publicadas). */
export function recuperarFichas(pregunta: string, publicadas: Actividad[], historial: MensajeChat[] = [], k = 6): Actividad[] {
  const pistas = extraerPistas([pregunta, ...historial.filter((m) => m.rol === 'usuario').slice(-2).map((m) => m.texto)].join(' '));
  const consulta = tokens(pregunta).filter((t) => !PALABRAS_GENERICAS.has(t));
  const limite = pistas.programa ? Math.max(k, 10) : k;
  const puntuadas = publicadas
    .filter((a) => a.estado === 'publicado')
    .map((a) => {
      let s = 0;
      for (const t of consulta) s += puntuar(a, t);
      if (pistas.momentos.length) {
        const hits = pistas.momentos.filter((m) => a.momentos.includes(m)).length;
        s += hits * 8;
        if (!hits && !pistas.programa) s -= 6;
      }
      if (pistas.minutos !== null && a.duracion) {
        if (a.duracion.min <= pistas.minutos) s += a.duracion.max <= pistas.minutos ? 6 : 3;
        else s -= 8;
      }
      if (pistas.principiantes) s += a.intensidad === 'suave' ? 4 : a.intensidad === 'profunda' ? -6 : 0;
      return { a, s };
    })
    .filter((x) => x.s > 0)
    .sort((x, y) => y.s - x.s || x.a.titulo.localeCompare(y.a.titulo, 'es'));
  if (pistas.programa) {
    // Cubrir varios momentos del retiro
    const elegidas: Actividad[] = [];
    for (const m of ['apertura', 'conexion', 'exploracion', 'integracion', 'cierre'] as Momento[]) {
      for (const x of puntuadas.filter((p) => p.a.momentos.includes(m)).slice(0, 2)) if (!elegidas.includes(x.a)) elegidas.push(x.a);
    }
    return elegidas.slice(0, limite);
  }
  return puntuadas.slice(0, limite).map((x) => x.a);
}

function recortar(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
}

/** Representación compacta de una ficha para el modelo. */
export function fichaCompacta(a: Actividad): string {
  const lineas = [
    `[[${a.id}]] ${a.titulo}`,
    `Momentos: ${a.momentos.map((m) => MOMENTO_NOMBRE[m]).join(', ')} · Duración: ${formatoRango(a.duracion)} · Formato: ${a.formato.map((f) => FORMATO_NOMBRE[f]).join(', ')} · Intensidad: ${INTENSIDAD_NOMBRE[a.intensidad]} · Experiencia de quien facilita: ${EXPERIENCIA_NOMBRE[a.experiencia]}`,
  ];
  if (a.objetivo) lineas.push(`Objetivo: ${recortar(a.objetivo, 220)}`);
  else if (a.contexto) lineas.push(`Propósito: ${recortar(a.contexto, 220)}`);
  if (a.materiales.length) lineas.push(`Materiales: ${recortar(a.materiales.map((m) => m.texto).join('; '), 200)}`);
  lineas.push(
    'Fases (fuente): ' +
      a.fases.map((f) => `${f.nombre}${f.tiempo ? ` (${f.tiempo.texto})` : ''}: ${recortar(f.pasos.join(' '), 160)}`).join(' | '),
  );
  if (a.cuandoUtilizar.length) lineas.push(`Cuándo utilizar: ${recortar(a.cuandoUtilizar.map((c) => c.texto).join(' '), 180)}`);
  if (a.cuandoEvitar.length) lineas.push(`Cuándo evitar: ${recortar(a.cuandoEvitar.map((c) => c.texto).join(' '), 180)}`);
  return lineas.join('\n');
}

export const INSTRUCCIONES_SISTEMA = `Eres el asistente de la app «Retiros Holísticos». Ayudas a facilitadoras a elegir, adaptar y ordenar dinámicas para retiros.
Reglas obligatorias:
1. Usa SOLO las fichas incluidas en <fichas>. Si ninguna encaja, dilo con claridad y sugiere buscar en la biblioteca. Nunca menciones ni inventes fichas que no estén en la lista.
2. Cada vez que recomiendes una actividad, escribe su título seguido de su identificador entre dobles corchetes, por ejemplo: Círculo de Gratitud [[circulo-de-gratitud]].
3. No añadas respiraciones con retención, contacto físico, ojos cubiertos, fuego ni ejercicios intensos que la ficha no indique. Si propones una adaptación (por ejemplo, acortar tiempos o cambiar el orden), escríbela bajo el rótulo «Adaptación sugerida» y no la presentes como parte de la ficha original.
4. Si faltan datos decisivos (objetivo, tiempo disponible, tamaño o experiencia del grupo), haz como máximo dos preguntas breves, o recomienda indicando tus supuestos.
5. Responde en español latinoamericano, en un máximo de 220 palabras, con Markdown simple (títulos cortos y listas). No uses tablas.
6. No prometas sanación ni resultados emocionales. No reemplazas la formación profesional. Recuerda que participar es voluntario (se puede pasar, observar o detenerse).
7. Si te piden un programa largo, entrega una propuesta compacta de máximo 6 bloques y ofrece continuar.`;

export function construirMensajes(pregunta: string, fichas: Actividad[], historial: MensajeChat[]): { rol: 'user' | 'assistant'; contenido: string }[] {
  const contexto = fichas.length
    ? `<fichas>\n${fichas.map(fichaCompacta).join('\n\n')}\n</fichas>`
    : '<fichas>\n(No hay fichas publicadas que coincidan con la consulta.)\n</fichas>';
  const msgs: { rol: 'user' | 'assistant'; contenido: string }[] = [];
  for (const m of historial.slice(-6)) msgs.push({ rol: m.rol === 'usuario' ? 'user' : 'assistant', contenido: m.texto });
  msgs.push({ rol: 'user', contenido: `${contexto}\n\nConsulta de la facilitadora: ${pregunta}` });
  return msgs;
}

export const MENSAJE_CONTINUAR = 'Continúa exactamente donde te quedaste, sin repetir lo ya escrito y respetando las mismas reglas.';

/** Extrae los identificadores citados y separa los válidos (recibidos) de los no verificados. */
export function citasEnTexto(texto: string, recibidas: Set<string>): { validas: string[]; noVerificadas: string[] } {
  const validas: string[] = [];
  const noVerificadas: string[] = [];
  for (const m of texto.matchAll(/\[\[([a-z0-9-]+)\]\]/g)) {
    const id = m[1];
    if (recibidas.has(id)) {
      if (!validas.includes(id)) validas.push(id);
    } else if (!noVerificadas.includes(id)) noVerificadas.push(id);
  }
  return { validas, noVerificadas };
}
