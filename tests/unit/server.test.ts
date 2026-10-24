// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';
import catalogo from '../../src/data/catalog.json';
import type { Actividad, Catalogo } from '../../src/domain/types';
import { paraCompradora } from '../../src/domain/visibility';
import { hottokValido, manejarWebhookHotmart, validarEvento, type DependenciasHotmart } from '../../server/hotmart';
import { _limpiarCache, manejarAsistente, validarPeticion, type DependenciasAsistente } from '../../server/asistente';

const cat = catalogo as unknown as Catalogo;
const publicadas = cat.actividades.filter((a) => a.estado === 'publicado').map(paraCompradora);

/* ------------------------------------------------------------------ Hotmart */

function eventoHotmart(extra: Record<string, unknown> = {}) {
  return {
    id: 'ev-123',
    creation_date: 1_700_000_000_000,
    event: 'PURCHASE_APPROVED',
    version: '2.0.0',
    data: {
      product: { id: 1234567, name: 'Producto' },
      buyer: { email: 'Compradora@Example.com', name: 'X', document: '000', address: { city: 'La Paz' } },
      purchase: { transaction: 'HP123', status: 'APPROVED', payment: { type: 'CREDIT_CARD', card: '****' } },
    },
    ...extra,
  };
}

function peticion(cuerpo: unknown, cabeceras: Record<string, string> = {}, metodo = 'POST') {
  return new Request('https://app.example.com/api/hotmart-webhook', {
    method: metodo,
    headers: { 'content-type': 'application/json', ...cabeceras },
    body: metodo === 'POST' ? (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)) : undefined,
  });
}

function depsHotmart(over: Partial<DependenciasHotmart> = {}): DependenciasHotmart & { procesar: ReturnType<typeof vi.fn> } {
  return {
    hottokEsperado: 'secreto-de-prueba',
    productos: ['1234567'],
    procesar: vi.fn(async () => ({ resultado: 'aplicado' as const, estado: 'activo', email: 'compradora@example.com', invitar: true })),
    invitar: vi.fn(async () => undefined),
    marcarInvitacion: vi.fn(async () => undefined),
    ...over,
  } as DependenciasHotmart & { procesar: ReturnType<typeof vi.fn> };
}

describe('Webhook de Hotmart', () => {
  it('compara el hottok en tiempo constante y rechaza valores vacíos', () => {
    expect(hottokValido('abc', 'abc')).toBe(true);
    expect(hottokValido('abd', 'abc')).toBe(false);
    expect(hottokValido(null, 'abc')).toBe(false);
    expect(hottokValido('abc', '')).toBe(false);
  });

  it('rechaza peticiones sin hottok o con hottok incorrecto (401) y no procesa', async () => {
    const d = depsHotmart();
    expect((await manejarWebhookHotmart(peticion(eventoHotmart()), d)).status).toBe(401);
    expect((await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': 'otro' }), d)).status).toBe(401);
    expect(d.procesar).not.toHaveBeenCalled();
  });

  it('falla cerrado si falta la configuración', async () => {
    const d = depsHotmart({ hottokEsperado: '' });
    expect((await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': '' }), d)).status).toBe(503);
  });

  it('valida método, JSON y forma del evento', async () => {
    const d = depsHotmart();
    const h = { 'x-hotmart-hottok': 'secreto-de-prueba' };
    expect((await manejarWebhookHotmart(peticion(null, h, 'GET'), d)).status).toBe(405);
    expect((await manejarWebhookHotmart(peticion('{no json', h), d)).status).toBe(400);
    expect((await manejarWebhookHotmart(peticion({ ...eventoHotmart(), event: 'drop table' }, h), d)).status).toBe(400);
    expect((await manejarWebhookHotmart(peticion({ ...eventoHotmart(), version: '1.0.0' }, h), d)).status).toBe(400);
    expect(validarEvento(eventoHotmart())).not.toBeNull();
  });

  it('procesa un evento válido, envía el acceso una sola vez y no reenvía datos de pago', async () => {
    const d = depsHotmart();
    const r = await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': 'secreto-de-prueba' }), d);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, resultado: 'aplicado' });
    const [enviado, productos] = d.procesar.mock.calls[0];
    expect(productos).toEqual(['1234567']);
    const texto = JSON.stringify(enviado);
    expect(texto).not.toMatch(/CREDIT_CARD|document|address|La Paz/);
    expect(enviado.data.product.id).toBe('1234567');
    expect(d.invitar).toHaveBeenCalledTimes(1);
    expect(d.marcarInvitacion).toHaveBeenCalledWith('compradora@example.com');
  });

  it('un evento duplicado responde 200 sin reenviar el acceso', async () => {
    const d = depsHotmart({ procesar: vi.fn(async () => ({ resultado: 'duplicado' as const })) });
    const r = await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': 'secreto-de-prueba' }), d);
    expect(r.status).toBe(200);
    expect(d.invitar).not.toHaveBeenCalled();
  });

  it('si la base de datos falla responde 500 para que Hotmart reintente', async () => {
    const d = depsHotmart({ procesar: vi.fn(async () => Promise.reject(new Error('caída'))) });
    expect((await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': 'secreto-de-prueba' }), d)).status).toBe(500);
  });

  it('un fallo al enviar el correo no rompe el webhook ni marca la invitación', async () => {
    const d = depsHotmart({ invitar: vi.fn(async () => Promise.reject(new Error('smtp'))) });
    const r = await manejarWebhookHotmart(peticion(eventoHotmart(), { 'x-hotmart-hottok': 'secreto-de-prueba' }), d);
    expect(r.status).toBe(200);
    expect(d.marcarInvitacion).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ Asistente */

function sseAnthropic(textos: string[], stop = 'end_turn'): Response {
  const eventos = [
    { type: 'message_start', message: { usage: { input_tokens: 1800 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    ...textos.map((t) => ({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: t } })),
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: stop }, usage: { output_tokens: 320 } },
    { type: 'message_stop' },
  ];
  const cuerpo = eventos.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(cuerpo, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

async function leerSSE(r: Response) {
  const texto = await r.text();
  return texto
    .split('\n\n')
    .filter(Boolean)
    .map((b) => ({ evento: /^event: (.+)$/m.exec(b)?.[1], datos: JSON.parse(/^data: (.+)$/m.exec(b)?.[1] ?? '{}') }));
}

function depsAsistente(over: Partial<DependenciasAsistente> = {}): DependenciasAsistente & { llamarModelo: ReturnType<typeof vi.fn>; registrarTokens: ReturnType<typeof vi.fn> } {
  return {
    verificarUsuario: async (t) => (t === 'token-valido' ? { id: 'u1', email: 'a@example.com' } : null),
    estadoAcceso: async () => ({ rol: 'compradora', acceso: 'activo' }),
    consumirCuota: async () => 19,
    registrarTokens: vi.fn(async () => undefined),
    cargarPublicadas: async () => publicadas as Actividad[],
    llamarModelo: vi.fn(async () => sseAnthropic(['### Propuesta\n', '- Círculo de Gratitud [[circulo-de-gratitud]]'])),
    limiteDiario: 20,
    modelo: 'claude-haiku-5-5',
    ...over,
  } as DependenciasAsistente & { llamarModelo: ReturnType<typeof vi.fn>; registrarTokens: ReturnType<typeof vi.fn> };
}

function pedir(cuerpo: unknown, token: string | null = 'token-valido') {
  return new Request('https://app.example.com/api/asistente', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
  });
}

describe('Función del asistente', () => {
  beforeEach(() => _limpiarCache());

  it('valida la petición', () => {
    expect(validarPeticion({ pregunta: 'Hola' })).not.toBeNull();
    expect(validarPeticion({ pregunta: '' })).toBeNull();
    expect(validarPeticion({ pregunta: 'x'.repeat(1501) })).toBeNull();
    expect(validarPeticion({ pregunta: 'ok', historial: [{ rol: 'system', texto: 'x' }] })).toBeNull();
    expect(validarPeticion({ pregunta: 'ok', fichasPrevias: ['<script>'] })).toBeNull();
  });

  it('exige sesión, acceso activo y respeta la cuota diaria', async () => {
    expect((await manejarAsistente(pedir({ pregunta: 'Hola' }, null), depsAsistente())).status).toBe(401);
    expect((await manejarAsistente(pedir({ pregunta: 'Hola' }, 'token-falso'), depsAsistente())).status).toBe(401);
    expect((await manejarAsistente(pedir({ pregunta: 'Hola' }), depsAsistente({ estadoAcceso: async () => ({ rol: 'compradora', acceso: 'reembolsado' }) }))).status).toBe(403);
    const sinCuota = await manejarAsistente(pedir({ pregunta: 'Hola' }), depsAsistente({ consumirCuota: async () => -1 }));
    expect(sinCuota.status).toBe(429);
    expect((await sinCuota.json()).codigo).toBe('limite');
  });

  it('transmite meta, texto y fin; envía al modelo solo fichas publicadas y las reglas como sistema', async () => {
    const d = depsAsistente();
    const r = await manejarAsistente(pedir({ pregunta: 'Necesito abrir un retiro de 20 personas en 30 minutos' }), d);
    expect(r.headers.get('content-type')).toContain('text/event-stream');
    const eventos = await leerSSE(r);
    expect(eventos[0].evento).toBe('meta');
    expect(eventos[0].datos.restantes).toBe(19);
    expect(eventos[0].datos.fichas.length).toBeGreaterThan(0);
    expect(eventos.filter((e) => e.evento === 'texto').map((e) => e.datos.delta).join('')).toContain('[[circulo-de-gratitud]]');
    expect(eventos[eventos.length - 1]).toEqual({ evento: 'fin', datos: { truncada: false } });
    const cuerpo = d.llamarModelo.mock.calls[0][0] as { system: string; messages: { role: string; content: string }[]; model: string; stream: boolean };
    expect(cuerpo.model).toBe('claude-haiku-5-5');
    expect(cuerpo.stream).toBe(true);
    expect(cuerpo.system).toContain('Usa SOLO las fichas');
    const enviado = cuerpo.messages.map((m) => m.content).join('\n');
    const ids = [...enviado.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1]);
    const publicadasIds = new Set(publicadas.map((a) => a.id));
    expect(ids.every((id) => publicadasIds.has(id))).toBe(true);
    expect(enviado).not.toMatch(/notasAdmin|incidencias/);
    expect(d.registrarTokens).toHaveBeenCalledWith('u1', 1800, 320);
  });

  it('marca la respuesta como truncada si se alcanzó el máximo de tokens', async () => {
    const d = depsAsistente({ llamarModelo: vi.fn(async () => sseAnthropic(['texto largo'], 'max_tokens')) });
    const eventos = await leerSSE(await manejarAsistente(pedir({ pregunta: 'Arma un programa de 3 días' }), d));
    expect(eventos[eventos.length - 1]).toEqual({ evento: 'fin', datos: { truncada: true } });
  });

  it('informa un fallo real del proveedor sin inventar respuesta', async () => {
    const d = depsAsistente({ llamarModelo: vi.fn(async () => new Response('{"error":"overloaded"}', { status: 529 })) });
    const eventos = await leerSSE(await manejarAsistente(pedir({ pregunta: 'Hola' }), d));
    expect(eventos.map((e) => e.evento)).toEqual(['meta', 'error']);
    expect(eventos.some((e) => e.evento === 'texto')).toBe(false);
  });

  it('«continuar» reutiliza las mismas fichas y pide seguir sin repetir', async () => {
    const d = depsAsistente();
    await leerSSE(
      await manejarAsistente(
        pedir({ pregunta: 'Arma un programa', continuar: true, fichasPrevias: ['circulo-de-gratitud'], historial: [{ rol: 'usuario', texto: 'Arma un programa' }, { rol: 'asistente', texto: 'Parte 1…' }] }),
        d,
      ),
    );
    const cuerpo = d.llamarModelo.mock.calls[0][0] as { messages: { role: string; content: string }[] };
    const ultimo = cuerpo.messages[cuerpo.messages.length - 1].content;
    expect(ultimo).toContain('Continúa exactamente donde te quedaste');
    expect([...ultimo.matchAll(/\[\[([a-z0-9-]+)\]\]/g)].map((m) => m[1])).toEqual(['circulo-de-gratitud']);
    expect(cuerpo.messages[0].role).toBe('user');
  });
});
