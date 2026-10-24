/* Modelo de datos del catálogo (generado por scripts/build_catalog.py) y de los datos del usuario. */

export type Estado = 'borrador' | 'revision' | 'publicado' | 'archivado';
export type Momento = 'apertura' | 'conexion' | 'exploracion' | 'integracion' | 'cierre';
export type Formato = 'individual' | 'parejas' | 'grupo';
export type Intensidad = 'suave' | 'media' | 'profunda';
export type Experiencia = 'inicial' | 'intermedia' | 'avanzada';
export type Origen = 'fuente' | 'fuente-ed2' | 'correccion' | 'adaptacion' | 'nuevo' | 'editorial' | 'sistema';
export type TipoFase = 'apertura' | 'desarrollo' | 'integracion' | 'cierre';

export interface Rango {
  min: number;
  max: number;
  texto: string;
}

export interface ItemTexto {
  texto: string;
  origen: Origen;
  retenido?: boolean;
  motivo?: string;
}

export interface Material {
  texto: string;
  ids: string[];
  opcional: boolean;
}

export interface Fase {
  id: string;
  nombre: string;
  tipo: TipoFase;
  tiempo: Rango | null;
  pasos: string[];
  citas: string[];
  preguntas: string[];
  nota: string | null;
  origen?: Origen;
}

export interface Seccion {
  titulo: string;
  tipo: 'lista' | 'preguntas' | 'frases';
  items: string[];
  nota?: string;
  cita?: string;
}

export interface Fuente {
  archivo: 'principal' | 'edicion2' | 'sistema';
  paginas: number[];
  rol: 'principal' | 'contraste' | 'recuperacion' | 'separador' | 'referencia';
}

export interface Correccion {
  campo: string;
  original: string;
  corregido: string;
  motivo: string;
}

export interface Incidencia {
  tipo: string;
  severidad: 'baja' | 'media' | 'alta';
  detalle: string;
}

export interface Propuesta {
  campo: string;
  texto: string;
  motivo: string;
  original?: string;
}

export interface Variante {
  id: string;
  titulo: string;
  tituloFuente: string;
  estado: Estado;
  fuente: { archivo: string; paginas: number[] };
  nota: string | null;
  subtitulo: string | null;
  contexto: string | null;
  fases: Fase[];
}

export interface Espacio {
  tipo: 'interior' | 'exterior' | 'ambos' | 'no-especificado';
  amplio?: boolean;
  texto?: string;
}

export interface Actividad {
  id: string;
  version: number;
  estado: Estado;
  motivoEstado: string | null;
  titulo: string;
  subtitulo: string | null;
  resumen: string | null;
  contexto: string | null;
  objetivo: string | null;
  momentos: Momento[];
  temas: string[];
  formato: Formato[];
  tipoFuente: string | null;
  duracion: Rango | null;
  notaDuracion: string | null;
  nivelFuente: string | null;
  energiaFuente: string | null;
  momentoFuente: string | null;
  enfoqueFuente: string | null;
  espacio: Espacio;
  participantes: string | null;
  materiales: Material[];
  ambiente: string[];
  preparacion: ItemTexto[];
  experiencia: Experiencia;
  intensidad: Intensidad;
  adaptaciones: ItemTexto[];
  consentimiento: ItemTexto[];
  criteriosPausa: ItemTexto[];
  cuandoUtilizar: ItemTexto[];
  cuandoEvitar: ItemTexto[];
  secciones: Seccion[];
  fases: Fase[];
  queObservar: ItemTexto[];
  recomendaciones: ItemTexto[];
  relacionadas: string[];
  variantes: Variante[];
  fuentes: Fuente[];
  correcciones: Correccion[];
  incidencias: Incidencia[];
  propuestas: Propuesta[];
  notasAdmin: string[];
  clasificacion: Record<string, { origen: string; motivo: string }>;
  sistemaProfesional: string | null;
  sumaFases: { min: number; max: number } | null;
  imagen: string | null;
  actualizado: string;
  orden: number;
  procedencia?: Record<string, string>;
}

export interface Catalogo {
  schema: number;
  generado: string;
  fuentes: Record<string, { titulo: string; paginas: number; drive: string }>;
  materialesCanonicos: { id: string; nombre: string }[];
  opcionesConsentimiento: Record<string, string>;
  incidenciasDocumento: {
    principal: {
      indice: unknown;
      pagina38: string;
      duplicados: { pagina: number; separador: string; igualA: number; detalle: string }[];
      separadorIncorrecto: { separador: number; dice: string; ficha: number; desarrolla: string }[];
      fichasIncompletas: { pagina: number; titulo: string; falta: string }[];
      piesDePagina: string;
    };
    edicion2: { paginas: number[]; problema: string }[];
  };
  resumen: Record<Estado, number>;
  actividades: Actividad[];
}

/* ------------------------------------------------------------------ Retiros */

export interface BloqueActividad {
  id: string;
  tipo: 'actividad';
  actividadId: string;
  duracion: number; // minutos planificados
  duracionAdaptada: boolean;
  horaFija: string | null; // HH:MM
  nota: string;
}

export interface BloqueLibre {
  id: string;
  tipo: 'pausa' | 'propio';
  titulo: string;
  duracion: number;
  horaFija: string | null;
  nota: string;
}

export type Bloque = BloqueActividad | BloqueLibre;

export interface Jornada {
  id: string;
  nombre: string;
  fecha: string | null; // YYYY-MM-DD
  inicio: string; // HH:MM
  fin: string | null; // HH:MM
  bloques: Bloque[];
}

export interface ChecklistPropio {
  id: string;
  texto: string;
  hecho: boolean;
}

export interface Retiro {
  id: string;
  nombre: string;
  objetivo: string;
  fecha: string | null;
  duracionPrevista: string;
  participantes: number | null;
  contexto: string;
  notas: string;
  jornadas: Jornada[];
  checklist: Record<string, boolean>;
  checklistPropios: ChecklistPropio[];
  offline: null | { guardado: string; actividades: Record<string, { version: number; data: Actividad }> };
  creado: string;
  actualizado: string;
  eliminado?: string | null;
}

/* ------------------------------------------------------------------ Facilitación */

export interface EstadoFacilitacion {
  clave: string; // actividadId o retiro/bloque
  actividadId: string;
  retiroId: string | null;
  bloqueId: string | null;
  faseIndex: number;
  pasoIndex: number;
  corriendo: boolean;
  inicioSegmento: number | null; // epoch ms del tramo en marcha
  acumuladoFaseMs: number; // tiempo de la fase antes del tramo en marcha
  acumuladoTotalMs: number; // tiempo total antes del tramo en marcha
  avisado: boolean; // aviso de tiempo previsto ya mostrado en la fase
  actualizado: string;
}

/* ------------------------------------------------------------------ Datos del usuario */

export type Tema = 'oscuro' | 'claro' | 'sistema';
export type TamanoLectura = 'normal' | 'grande' | 'muy-grande';

export interface Preferencias {
  tema: Tema;
  tamano: TamanoLectura;
  reducirMovimiento: 'sistema' | 'si';
  sonidos: boolean;
  /** Mantener la pantalla encendida durante la facilitación (si el navegador lo permite). */
  pantallaActiva: boolean;
}

export interface DatosUsuario {
  version: 1;
  perfil: { nombre: string };
  preferencias: Preferencias;
  favoritos: Record<string, string>;
  notasActividad: Record<string, { texto: string; actualizado: string }>;
  usos: Record<string, string[]>;
  recientes: string[];
  retiros: Retiro[];
  papelera: Retiro[];
  facilitacion: Record<string, EstadoFacilitacion>;
  asistente: { dia: string; consultas: number };
  actualizado: string;
}

export type Rol = 'compradora' | 'admin';
