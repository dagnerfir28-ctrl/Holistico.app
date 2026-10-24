/** Variables de compilación. Nunca coloques aquí claves privadas: todo lo que empieza por VITE_ llega al navegador. */
export type ModoDatos = 'local' | 'demo' | 'supabase';

export const TARGET = import.meta.env.VITE_TARGET as 'web' | 'artifact';
export const MODO_DATOS = import.meta.env.VITE_DATA_MODE as ModoDatos;
export const ES_ARTIFACT = TARGET === 'artifact';

/** URL y clave pública (anon) de Supabase. La clave anon es pública por diseño; la seguridad la dan las políticas RLS. */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';
/** Ruta de la función del asistente en el servidor (por ejemplo, /api/asistente). Vacío = sin asistente con IA propio. */
export const API_ASISTENTE: string = import.meta.env.VITE_ASSISTANT_API ?? '';

export const NOMBRE_MODO: Record<ModoDatos, string> = {
  local: 'Vista previa privada',
  demo: 'Demostración limitada',
  supabase: 'Producción',
};
