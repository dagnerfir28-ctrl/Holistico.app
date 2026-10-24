/**
 * Pruebas de la base de datos (RLS, permisos, funciones) sobre un PostgreSQL local efímero.
 * Simula el entorno de Supabase con tests/db/auth-stub.sql y aplica supabase/migrations/0001_init.sql.
 * Uso: node tests/db/run-db-tests.mjs   (requiere PostgreSQL 15 o superior instalado localmente)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, readdirSync, chmodSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const RAIZ = resolve('.');
const binDir = (() => {
  const base = '/usr/lib/postgresql';
  if (existsSync(base)) {
    const v = readdirSync(base).sort().reverse()[0];
    if (v && existsSync(join(base, v, 'bin', 'initdb'))) return join(base, v, 'bin');
  }
  return '';
})();
const bin = (n) => (binDir ? join(binDir, n) : n);
const esRoot = process.getuid?.() === 0;
const usuarioSO = esRoot ? 'claude' : undefined;

function comoUsuarioSO(cmd, args) {
  if (usuarioSO) return execFileSync('runuser', ['-u', usuarioSO, '--', cmd, ...args], { stdio: 'pipe' });
  return execFileSync(cmd, args, { stdio: 'pipe' });
}

const dir = mkdtempSync(join(tmpdir(), 'rh-pg-'));
if (usuarioSO) execFileSync('chown', ['-R', `${usuarioSO}:${usuarioSO}`, dir]);
chmodSync(dir, 0o700);
const datos = join(dir, 'data');
const puerto = 54000 + Math.floor(Math.random() * 1000);

comoUsuarioSO(bin('initdb'), ['-D', datos, '-A', 'trust', '-U', 'postgres', '--no-instructions']);
comoUsuarioSO(bin('pg_ctl'), ['-D', datos, '-o', `-p ${puerto} -k ${dir} -c listen_addresses=''`, '-l', join(dir, 'log.txt'), '-w', 'start']);

const resultados = [];
let cliente;

async function prueba(nombre, fn) {
  try {
    await fn();
    resultados.push({ nombre, ok: true });
    console.log(`✓ ${nombre}`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message });
    console.log(`✗ ${nombre}\n    ${e.message}`);
  }
}
function afirmar(c, m) {
  if (!c) throw new Error(m);
}

/** Ejecuta fn dentro de una transacción con el rol y los claims indicados; siempre deshace al final salvo `confirmar`. */
async function como(rol, claims, fn, confirmar = false) {
  await cliente.query('begin');
  try {
    await cliente.query(`set local role ${rol}`);
    await cliente.query(`select set_config('request.jwt.claims', $1, true)`, [claims ? JSON.stringify(claims) : '']);
    const r = await fn(cliente);
    await cliente.query(confirmar ? 'commit' : 'rollback');
    return r;
  } catch (e) {
    await cliente.query('rollback');
    throw e;
  }
}

async function esperaError(promesa, codigo) {
  try {
    await promesa;
  } catch (e) {
    if (codigo && e.code !== codigo) throw new Error(`Se esperaba el error ${codigo} y llegó ${e.code}: ${e.message}`);
    return e;
  }
  throw new Error(`Se esperaba un error${codigo ? ` ${codigo}` : ''}`);
}

try {
  cliente = new pg.Client({ host: dir, port: puerto, user: 'postgres', database: 'postgres' });
  await cliente.connect();

  const usuarios = {
    a: { id: randomUUID(), email: 'ana@example.com' },
    b: { id: randomUUID(), email: 'bea@example.com' },
    c: { id: randomUUID(), email: 'carla@example.com' },
    admin: { id: randomUUID(), email: 'admin@example.com' },
    e: { id: randomUUID(), email: 'compradora.hotmart@example.com' },
  };
  const claims = (u) => ({ sub: u.id, email: u.email, role: 'authenticated' });

  await prueba('El esquema se aplica sobre el entorno simulado y se puede volver a aplicar', async () => {
    await cliente.query(readFileSync(join(RAIZ, 'tests/db/auth-stub.sql'), 'utf8'));
    const sql = readFileSync(join(RAIZ, 'supabase/migrations/0001_init.sql'), 'utf8');
    await cliente.query(sql);
    await cliente.query(sql);
    for (const u of Object.values(usuarios)) await cliente.query('insert into auth.users(id, email) values ($1, $2)', [u.id, u.email]);
    await cliente.query("insert into perfiles(user_id, email, rol) values ($1, $2, 'admin')", [usuarios.admin.id, usuarios.admin.email]);
  });

  const catalogo = JSON.parse(readFileSync(join(RAIZ, 'src/data/catalog.json'), 'utf8'));
  await prueba('Importación del catálogo: 71 actividades únicas y 53 publicadas', async () => {
    const r = await cliente.query('select importar_catalogo($1::jsonb) as n', [JSON.stringify(catalogo)]);
    afirmar(r.rows[0].n === 71, `Importadas: ${r.rows[0].n}`);
    const p = await cliente.query("select count(*)::int n from actividades where estado = 'publicado' and datos_publicos is not null");
    afirmar(p.rows[0].n === 53, `Publicadas: ${p.rows[0].n}`);
    const meta = await cliente.query("select valor from catalogo_meta where clave = 'base'");
    const fuentes = meta.rows[0].valor.fuentes;
    afirmar(!fuentes.sistema && Object.values(fuentes).every((f) => f.drive === ''), 'Los metadatos públicos no deben incluir enlaces a los PDF ni el Sistema Profesional');
  });

  await prueba('La depuración del servidor coincide con la de la app (paraCompradora)', async () => {
    // Se compila la función de la app para comparar con exactamente la misma lógica.
    const salida = join(dir, 'visibility.mjs');
    execFileSync(join(RAIZ, 'node_modules/.bin/esbuild'), [join(RAIZ, 'src/domain/visibility.ts'), '--bundle', '--format=esm', '--platform=node', `--outfile=${salida}`, '--log-level=warning']);
    const { paraCompradora } = await import(salida);
    const r = await cliente.query("select id, datos_publicos from actividades where estado = 'publicado' order by id");
    const porId = new Map(catalogo.actividades.map((a) => [a.id, a]));
    const orden = (x) => (Array.isArray(x) ? x.map(orden) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, orden(x[k])])) : x);
    for (const fila of r.rows) {
      const esperado = orden(paraCompradora(porId.get(fila.id)));
      const obtenido = orden(fila.datos_publicos);
      afirmar(JSON.stringify(esperado) === JSON.stringify(obtenido), `Diferencia en ${fila.id}`);
      const t = JSON.stringify(fila.datos_publicos);
      afirmar(!t.includes('"retenido":true'), `Texto retenido expuesto en ${fila.id}`);
    }
  });

  await prueba('Sin acceso: no se puede leer el catálogo ni la tabla de actividades', async () => {
    await como('authenticated', claims(usuarios.c), async (db) => {
      const e = await db.query('select * from estado_acceso()');
      afirmar(e.rows[0].acceso === 'sin-acceso', 'Debe figurar sin acceso');
    }, true);
    await esperaError(como('authenticated', claims(usuarios.c), (db) => db.query('select * from catalogo_publicado()')), '42501');
    const n = await como('authenticated', claims(usuarios.c), (db) => db.query('select count(*)::int n from actividades'));
    afirmar(n.rows[0].n === 0, 'RLS debe ocultar la tabla de actividades');
    const m = await como('authenticated', claims(usuarios.c), (db) => db.query('select count(*)::int n from catalogo_meta'));
    afirmar(m.rows[0].n === 0, 'RLS debe ocultar los metadatos');
  });

  await prueba('Anónimos no pueden leer datos ni ejecutar funciones', async () => {
    await esperaError(como('anon', null, (db) => db.query('select * from retiros')), '42501');
    await esperaError(como('anon', null, (db) => db.query('select * from catalogo_publicado()')), '42501');
  });

  await prueba('Alta manual por administración y acceso al catálogo depurado', async () => {
    await como('authenticated', claims(usuarios.admin), async (db) => {
      await db.query('select conceder_acceso_manual($1, $2)', [usuarios.a.email, 'Prueba']);
      await db.query('select conceder_acceso_manual($1, $2)', ['BEA@Example.com', 'Mayúsculas']);
    }, true);
    const r = await como('authenticated', claims(usuarios.a), async (db) => {
      const e = await db.query('select * from estado_acceso()');
      afirmar(e.rows[0].acceso === 'activo' && e.rows[0].rol === 'compradora', `Estado: ${JSON.stringify(e.rows[0])}`);
      return db.query('select * from catalogo_publicado()');
    }, true);
    afirmar(r.rows.length === 53, `Fichas: ${r.rows.length}`);
    afirmar(r.rows.every((x) => x.datos.notasAdmin.length === 0 && x.datos.incidencias.length === 0 && x.datos.propuestas.length === 0), 'Sin datos internos');
    const t = await como('authenticated', claims(usuarios.a), (db) => db.query('select count(*)::int n from actividades'));
    afirmar(t.rows[0].n === 0, 'Una compradora no lee la tabla completa');
    const m = await como('authenticated', claims(usuarios.a), (db) => db.query('select clave from catalogo_meta order by clave'));
    afirmar(m.rows.map((x) => x.clave).join() === 'base', `Metadatos visibles: ${m.rows.map((x) => x.clave).join()}`);
  });

  await prueba('Aislamiento: nadie lee ni modifica los retiros o notas de otra persona', async () => {
    await como('authenticated', claims(usuarios.b), (db) => db.query('select * from estado_acceso()'), true);
    await como('authenticated', claims(usuarios.a), async (db) => {
      await db.query('insert into retiros(user_id, id, datos) values ($1, $2, $3)', [usuarios.a.id, 'ret-1', JSON.stringify({ id: 'ret-1', nombre: 'Privado de Ana' })]);
      await db.query('insert into datos_usuario(user_id, datos) values ($1, $2)', [usuarios.a.id, JSON.stringify({ notasActividad: { x: { texto: 'nota privada' } } })]);
    }, true);
    const leer = await como('authenticated', claims(usuarios.b), (db) => db.query('select count(*)::int n from retiros'));
    afirmar(leer.rows[0].n === 0, 'B no debe ver retiros de A');
    const notas = await como('authenticated', claims(usuarios.b), (db) => db.query('select count(*)::int n from datos_usuario'));
    afirmar(notas.rows[0].n === 0, 'B no debe ver datos de A');
    const upd = await como('authenticated', claims(usuarios.b), (db) => db.query("update retiros set datos = '{}' where id = 'ret-1'"));
    afirmar(upd.rowCount === 0, 'B no debe poder modificar el retiro de A');
    const del = await como('authenticated', claims(usuarios.b), (db) => db.query("delete from retiros where id = 'ret-1'"));
    afirmar(del.rowCount === 0, 'B no debe poder borrar el retiro de A');
    await esperaError(
      como('authenticated', claims(usuarios.b), (db) => db.query('insert into retiros(user_id, id, datos) values ($1, $2, $3)', [usuarios.a.id, 'ret-falso', '{}'])),
      '42501',
    );
    const propio = await como('authenticated', claims(usuarios.a), (db) => db.query('select count(*)::int n from retiros'));
    afirmar(propio.rows[0].n === 1, 'A sí ve su retiro');
  });

  await prueba('Sin acceso activo no se pueden guardar retiros nuevos', async () => {
    await esperaError(
      como('authenticated', claims(usuarios.c), (db) => db.query('insert into retiros(user_id, id, datos) values ($1, $2, $3)', [usuarios.c.id, 'ret-c', '{}'])),
      '42501',
    );
  });

  await prueba('Solo administración edita el catálogo, con versión, historial y validación de publicación', async () => {
    await esperaError(como('authenticated', claims(usuarios.a), (db) => db.query('select guardar_actividad($1::jsonb, $2)', [JSON.stringify(catalogo.actividades[0]), 'x'])), '42501');
    await esperaError(como('authenticated', claims(usuarios.a), (db) => db.query('select conceder_acceso_manual($1, null)', ['otra@example.com'])), '42501');
    const original = catalogo.actividades.find((x) => x.id === 'circulo-de-gratitud');
    const r = await como('authenticated', claims(usuarios.admin), async (db) => {
      const g = await db.query('select guardar_actividad($1::jsonb, $2) as d', [JSON.stringify({ ...original, titulo: 'Círculo de Gratitud (editado)' }), 'Edición de prueba']);
      const h = await db.query("select count(*)::int n, max(version) v from actividad_versiones where actividad_id = 'circulo-de-gratitud'");
      return { g: g.rows[0].d, h: h.rows[0] };
    }, true);
    afirmar(r.g.version === original.version + 1, `Versión: ${r.g.version}`);
    afirmar(r.h.n === 2 && r.h.v === original.version + 1, `Historial: ${JSON.stringify(r.h)}`);
    const sinDuracion = { ...original, id: 'prueba-incompleta', duracion: null };
    await esperaError(como('authenticated', claims(usuarios.admin), (db) => db.query('select guardar_actividad($1::jsonb, $2)', [JSON.stringify(sinDuracion), 'x'])), '23514');
    await esperaError(
      como('authenticated', claims(usuarios.admin), (db) => db.query('select guardar_actividad($1::jsonb, $2)', [JSON.stringify({ ...original, id: 'Mal ID!' }), 'x'])),
      '22023',
    );
    const visible = await como('authenticated', claims(usuarios.a), (db) => db.query("select datos->>'titulo' t from catalogo_publicado() where id = 'circulo-de-gratitud'"));
    afirmar(visible.rows[0].t === 'Círculo de Gratitud (editado)', 'La compradora ve la versión publicada actualizada');
  });

  await prueba('Configuración del catálogo: solo administración y con valores válidos', async () => {
    await esperaError(como('authenticated', claims(usuarios.a), (db) => db.query(`select guardar_config_catalogo('{"ordenMomentos":["cierre","apertura","conexion","exploracion","integracion"]}')`)), '42501');
    await esperaError(como('authenticated', claims(usuarios.admin), (db) => db.query(`select guardar_config_catalogo('{"ordenMomentos":["cierre","cierre","conexion","exploracion","integracion"]}')`)), '22023');
    await como('authenticated', claims(usuarios.admin), (db) => db.query(`select guardar_config_catalogo('{"ordenMomentos":["cierre","apertura","conexion","exploracion","integracion"]}')`), true);
    const m = await como('authenticated', claims(usuarios.a), (db) => db.query("select valor from catalogo_meta where clave = 'config'"));
    afirmar(m.rows[0].valor.ordenMomentos[0] === 'cierre', 'La configuración pública es legible con acceso');
  });

  const evento = (id, tipo, extra = {}) => ({
    id,
    creation_date: extra.ts ?? Date.now(),
    event: tipo,
    version: '2.0.0',
    data: {
      product: { id: extra.producto ?? 1234567, name: 'Producto' },
      buyer: { email: extra.email ?? usuarios.e.email, name: 'Compradora' },
      purchase: { transaction: extra.trx ?? 'HP0001', status: 'APPROVED' },
    },
  });
  const procesar = (ev) => como('service_role', null, (db) => db.query('select procesar_evento_hotmart($1::jsonb, $2::text[]) r', [JSON.stringify(ev), ['1234567']]), true).then((x) => x.rows[0].r);

  await prueba('Eventos de Hotmart: solo con la clave de servicio', async () => {
    await esperaError(como('authenticated', claims(usuarios.admin), (db) => db.query('select procesar_evento_hotmart($1::jsonb, $2::text[])', [JSON.stringify(evento('x', 'PURCHASE_APPROVED')), ['1234567']])), '42501');
  });

  await prueba('Eventos de Hotmart: compra aprobada, duplicado idempotente, otro producto y vinculación de la cuenta', async () => {
    const r1 = await procesar(evento('ev-1', 'PURCHASE_APPROVED', { ts: 1000 }));
    afirmar(r1.resultado === 'aplicado' && r1.estado === 'activo' && r1.invitar === true, JSON.stringify(r1));
    const r2 = await procesar(evento('ev-1', 'PURCHASE_APPROVED', { ts: 1000 }));
    afirmar(r2.resultado === 'duplicado', 'Un mismo evento no se procesa dos veces');
    const r2b = await procesar(evento('ev-1b', 'PURCHASE_COMPLETE', { ts: 1100 }));
    afirmar(r2b.resultado === 'aplicado' && r2b.invitar === true, 'COMPLETE mantiene el acceso (la invitación se marca aparte)');
    await como('service_role', null, (db) => db.query('select marcar_invitacion_enviada($1)', [usuarios.e.email]), true);
    const r2c = await procesar(evento('ev-1c', 'PURCHASE_APPROVED', { ts: 1150 }));
    afirmar(r2c.invitar === false, 'No se envía un segundo acceso a la misma persona');
    const r3 = await procesar(evento('ev-otro', 'PURCHASE_APPROVED', { producto: 999, email: 'otra@example.com' }));
    afirmar(r3.resultado === 'ignorado' && r3.motivo === 'producto', 'Los adicionales u otros productos no desbloquean la app');
    const sesion = await como('authenticated', claims(usuarios.e), (db) => db.query('select * from estado_acceso()'), true);
    afirmar(sesion.rows[0].acceso === 'activo', 'La compradora entra con el correo de la compra');
  });

  await prueba('Eventos de Hotmart: disputa, otra compra cancelada, reembolso y evento atrasado', async () => {
    const d = await procesar(evento('ev-2', 'PURCHASE_PROTEST', { ts: 2000 }));
    afirmar(d.resultado === 'sin-cambio' && d.estado === 'activo', `Disputa: ${JSON.stringify(d)}`);
    const c = await procesar(evento('ev-3', 'PURCHASE_CANCELED', { ts: 2500, trx: 'HP0002' }));
    afirmar(c.resultado === 'sin-cambio', 'Cancelar otra compra no quita el acceso activo');
    const r = await procesar(evento('ev-4', 'PURCHASE_REFUNDED', { ts: 3000 }));
    afirmar(r.resultado === 'aplicado' && r.estado === 'reembolsado', `Reembolso: ${JSON.stringify(r)}`);
    const a = await procesar(evento('ev-5', 'PURCHASE_APPROVED', { ts: 1500 }));
    afirmar(a.resultado === 'atrasado', 'Un evento antiguo de la misma compra no reactiva el acceso');
    const sesion = await como('authenticated', claims(usuarios.e), (db) => db.query('select * from estado_acceso()'));
    afirmar(sesion.rows[0].acceso === 'reembolsado', 'Tras el reembolso no hay acceso');
    await esperaError(como('authenticated', claims(usuarios.e), (db) => db.query('select * from catalogo_publicado()')), '42501');
    const nueva = await procesar(evento('ev-6', 'PURCHASE_APPROVED', { ts: 4000, trx: 'HP0003' }));
    afirmar(nueva.estado === 'activo', 'Una compra nueva vuelve a dar acceso');
  });

  await prueba('Cuota diaria del asistente atómica', async () => {
    const consumir = () => como('service_role', null, (db) => db.query('select consumir_cuota_asistente($1, 3) r', [usuarios.a.id]), true).then((x) => x.rows[0].r);
    const valores = [await consumir(), await consumir(), await consumir(), await consumir()];
    afirmar(JSON.stringify(valores) === JSON.stringify([2, 1, 0, -1]), `Restantes: ${valores}`);
    await esperaError(como('authenticated', claims(usuarios.a), (db) => db.query('select consumir_cuota_asistente($1, 100)', [usuarios.a.id])), '42501');
  });

  await prueba('Revocar acceso desde administración corta el catálogo', async () => {
    await como('authenticated', claims(usuarios.admin), (db) => db.query('select revocar_acceso($1, $2)', [usuarios.b.email, 'Prueba']), true);
    await esperaError(como('authenticated', claims(usuarios.b), (db) => db.query('select * from catalogo_publicado()')), '42501');
  });
} finally {
  await cliente?.end().catch(() => undefined);
  try {
    comoUsuarioSO(bin('pg_ctl'), ['-D', datos, '-m', 'immediate', 'stop']);
  } catch {
    /* ya detenido */
  }
  rmSync(dir, { recursive: true, force: true });
}

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} pruebas de base de datos superadas`);
process.exit(fallos.length ? 1 : 0);
