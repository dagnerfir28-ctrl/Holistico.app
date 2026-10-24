/**
 * Vercel Function: POST /api/asistente (respuesta en streaming SSE)
 * Variables de entorno (solo servidor): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * ANTHROPIC_API_KEY, ASISTENTE_MODELO (por defecto claude-haiku-5-5), ASISTENTE_LIMITE_DIARIO (por defecto 20).
 */
import { createClient } from '@supabase/supabase-js';
import type { Actividad } from '../src/domain/types';
import { llamarAnthropic, manejarAsistente } from '../server/asistente';

export const config = { maxDuration: 60 };

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? '';
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const claveIA = process.env.ANTHROPIC_API_KEY ?? '';
  if (!url || !anon || !servicio || !claveIA) {
    return new Response(JSON.stringify({ codigo: 'no-disponible', mensaje: 'El asistente con IA no está configurado.' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const comoUsuario = (token: string) =>
    createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` } } });

  return manejarAsistente(request, {
    verificarUsuario: async (token) => {
      const { data, error } = await admin.auth.getUser(token);
      if (error || !data.user) return null;
      return { id: data.user.id, email: data.user.email ?? '' };
    },
    estadoAcceso: async (token) => {
      const { data, error } = await comoUsuario(token).rpc('estado_acceso');
      if (error) return null;
      const fila = (Array.isArray(data) ? data[0] : data) as { rol: string; acceso: string } | null;
      return fila ?? null;
    },
    consumirCuota: async (userId, limite) => {
      const { data, error } = await admin.rpc('consumir_cuota_asistente', { p_user: userId, p_limite: limite });
      if (error) throw new Error(error.message);
      return data as number;
    },
    registrarTokens: async (userId, entrada, salida) => {
      await admin.rpc('registrar_tokens_asistente', { p_user: userId, p_entrada: entrada, p_salida: salida });
    },
    cargarPublicadas: async (token) => {
      const { data, error } = await comoUsuario(token).rpc('catalogo_publicado');
      if (error) throw new Error(error.message);
      return ((data ?? []) as { datos: Actividad }[]).map((r) => r.datos);
    },
    llamarModelo: llamarAnthropic(claveIA),
    limiteDiario: Number(process.env.ASISTENTE_LIMITE_DIARIO ?? '20') || 20,
    modelo: process.env.ASISTENTE_MODELO || 'claude-haiku-5-5',
    registrar: (mensaje, datos) => console.log(JSON.stringify({ origen: 'asistente', mensaje, ...(datos ?? {}) })),
  });
}
