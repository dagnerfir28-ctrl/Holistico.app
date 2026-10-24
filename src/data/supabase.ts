/** Cliente de Supabase (solo se carga en el modo de producción). */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config/env';

let cliente: Promise<SupabaseClient> | null = null;

export function supabaseConfigurado(): boolean {
  return /^https:\/\//.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 20;
}

export function obtenerSupabase(): Promise<SupabaseClient> {
  if (!supabaseConfigurado()) return Promise.reject(new Error('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'));
  cliente ??= import('@supabase/supabase-js').then((m) =>
    m.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    }),
  );
  return cliente;
}
