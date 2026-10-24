/**
 * Vercel Function: POST /api/hotmart-webhook
 * Variables de entorno (solo servidor): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY,
 * HOTMART_HOTTOK, HOTMART_PRODUCT_IDS (ids separados por comas), HOTMART_ENVIAR_ACCESO=true|false, APP_URL.
 */
import { createClient } from '@supabase/supabase-js';
import { manejarWebhookHotmart, type ResultadoEvento } from '../server/hotmart';

export async function POST(request: Request): Promise<Response> {
  const url = process.env.SUPABASE_URL ?? '';
  const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  const anon = process.env.SUPABASE_ANON_KEY ?? '';
  if (!url || !servicio) return new Response(JSON.stringify({ ok: false, error: 'Servicio no configurado' }), { status: 503 });
  const admin = createClient(url, servicio, { auth: { persistSession: false, autoRefreshToken: false } });
  const publico = anon ? createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
  const enviarAcceso = process.env.HOTMART_ENVIAR_ACCESO === 'true' && !!publico;

  return manejarWebhookHotmart(request, {
    hottokEsperado: process.env.HOTMART_HOTTOK ?? '',
    productos: (process.env.HOTMART_PRODUCT_IDS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    procesar: async (evento, productos) => {
      const { data, error } = await admin.rpc('procesar_evento_hotmart', { p_evento: evento, p_productos: productos });
      if (error) throw new Error(error.message);
      return data as ResultadoEvento;
    },
    invitar: enviarAcceso
      ? async (email) => {
          const { error } = await publico!.auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: process.env.APP_URL } });
          if (error) throw new Error(error.message);
        }
      : undefined,
    marcarInvitacion: async (email) => {
      const { error } = await admin.rpc('marcar_invitacion_enviada', { p_email: email });
      if (error) throw new Error(error.message);
    },
    // Registro sin datos personales (ni correos ni datos de pago).
    registrar: (mensaje, datos) => console.log(JSON.stringify({ origen: 'hotmart-webhook', mensaje, ...(datos ?? {}) })),
  });
}
