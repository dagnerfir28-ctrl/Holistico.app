import type { Experiencia, Formato, Intensidad, Momento, Origen, Estado, TipoFase } from './types';

export const MOMENTOS: { id: Momento; nombre: string; descripcion: string }[] = [
  { id: 'apertura', nombre: 'Apertura', descripcion: 'Llegada, inicio del día, crear un espacio seguro.' },
  { id: 'conexion', nombre: 'Conexión', descripcion: 'Vínculo y confianza entre participantes.' },
  { id: 'exploracion', nombre: 'Reflexión o exploración', descripcion: 'Introspección y trabajo personal.' },
  { id: 'integracion', nombre: 'Integración', descripcion: 'Asimilar, anclar y transitar con calma.' },
  { id: 'cierre', nombre: 'Cierre', descripcion: 'Final de jornada o despedida del retiro.' },
];

export const MOMENTO_NOMBRE: Record<Momento, string> = Object.fromEntries(MOMENTOS.map((m) => [m.id, m.nombre])) as Record<Momento, string>;

export const FORMATOS: { id: Formato; nombre: string }[] = [
  { id: 'individual', nombre: 'Individual' },
  { id: 'parejas', nombre: 'En parejas' },
  { id: 'grupo', nombre: 'En grupo' },
];
export const FORMATO_NOMBRE: Record<Formato, string> = { individual: 'Individual', parejas: 'En parejas', grupo: 'En grupo' };

export const INTENSIDADES: { id: Intensidad; nombre: string; nivel: number; descripcion: string }[] = [
  { id: 'suave', nombre: 'Suave', nivel: 1, descripcion: 'Presencia, gratitud, observación o compartir ligero.' },
  { id: 'media', nombre: 'Media', nivel: 2, descripcion: 'Compartir experiencias o emociones personales.' },
  { id: 'profunda', nombre: 'Profunda', nivel: 3, descripcion: 'Heridas, culpa, perdón, sombra o vulnerabilidad.' },
];
export const INTENSIDAD_NOMBRE: Record<Intensidad, string> = { suave: 'Suave', media: 'Media', profunda: 'Profunda' };
export const INTENSIDAD_NIVEL: Record<Intensidad, number> = { suave: 1, media: 2, profunda: 3 };

export const EXPERIENCIAS: { id: Experiencia; nombre: string; descripcion: string }[] = [
  { id: 'inicial', nombre: 'Inicial', descripcion: 'Estructura simple, sin técnicas especiales.' },
  { id: 'intermedia', nombre: 'Intermedia', descripcion: 'Sostener compartir grupal, narrar o preparar materiales.' },
  { id: 'avanzada', nombre: 'Avanzada', descripcion: 'Procesos profundos, contención y manejo de contingencias.' },
];
export const EXPERIENCIA_NOMBRE: Record<Experiencia, string> = { inicial: 'Inicial', intermedia: 'Intermedia', avanzada: 'Avanzada' };

export const ESPACIOS = [
  { id: 'interior', nombre: 'Interior' },
  { id: 'exterior', nombre: 'Exterior' },
  { id: 'ambos', nombre: 'Interior o exterior' },
  { id: 'amplio', nombre: 'Requiere espacio amplio' },
] as const;

export const ORIGEN_NOMBRE: Record<Origen, string> = {
  fuente: 'Fiel a la fuente',
  'fuente-ed2': 'Recuperado de la Edición 2',
  correccion: 'Corrección editorial',
  adaptacion: 'Orientación editorial',
  nuevo: 'Contenido nuevo pendiente de aprobación',
  editorial: 'Clasificación editorial',
  sistema: 'Basado en el Sistema Profesional',
};

export const ESTADO_NOMBRE: Record<Estado, string> = {
  publicado: 'Publicada',
  revision: 'En revisión',
  borrador: 'Borrador',
  archivado: 'Archivada',
};

export const TIPO_FASE_NOMBRE: Record<TipoFase, string> = {
  apertura: 'Apertura',
  desarrollo: 'Desarrollo',
  integracion: 'Integración',
  cierre: 'Cierre',
};

export const ARCHIVO_NOMBRE: Record<string, string> = {
  principal: 'PDF principal',
  edicion2: 'Edición 2',
  sistema: 'Sistema Profesional',
};

/** Grupos de materiales para filtrar (a partir de los materiales canónicos de la fuente). */
export const GRUPOS_MATERIAL: { id: string; nombre: string; ids: string[] }[] = [
  { id: 'escritura', nombre: 'Papel y escritura', ids: ['papel', 'boligrafos', 'tarjetas'] },
  { id: 'arte', nombre: 'Arte y manualidades', ids: ['colores', 'papel-grande', 'tijeras-pegamento', 'revistas', 'compas-regla'] },
  { id: 'velas', nombre: 'Velas o fuego', ids: ['velas', 'vela-central', 'velas-individuales', 'fogata'] },
  { id: 'sonido', nombre: 'Música o instrumentos', ids: ['musica', 'cuenco-campana', 'instrumentos', 'tambor'] },
  { id: 'naturaleza', nombre: 'Elementos naturales', ids: ['elementos-naturales', 'recipiente-agua-tierra', 'incienso'] },
];
export const MATERIALES_BASICOS = new Set(['cojines-esterillas', 'mantas', 'sillas', 'agua', 'panuelos']);
