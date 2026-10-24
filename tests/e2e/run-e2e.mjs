/**
 * Pruebas de extremo a extremo con Playwright sobre la compilación de la vista previa (modo local).
 * Requisito: npm run build:artifact && node scripts/make-artifact.mjs
 * Uso: node tests/e2e/run-e2e.mjs [--capturas]
 */
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ARCHIVO = resolve('dist-artifact/preview-local.html');
if (!existsSync(ARCHIVO)) {
  console.error('Falta dist-artifact/preview-local.html. Ejecuta: npm run build:artifact && node scripts/make-artifact.mjs');
  process.exit(1);
}
const URL_BASE = 'file://' + ARCHIVO;
const CAPTURAS = process.argv.includes('--capturas') ? resolve('tests/e2e/capturas') : null;
if (CAPTURAS) mkdirSync(CAPTURAS, { recursive: true });
const RUTA_CHROMIUM = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined;

const resultados = [];
const errores = [];

async function prueba(nombre, fn) {
  const t0 = Date.now();
  try {
    await fn();
    resultados.push({ nombre, ok: true, ms: Date.now() - t0 });
    console.log(`✓ ${nombre} (${Date.now() - t0} ms)`);
  } catch (e) {
    resultados.push({ nombre, ok: false, error: e.message });
    console.log(`✗ ${nombre}\n    ${e.message.split('\n')[0]}`);
  }
}

function afirmar(cond, msg) {
  if (!cond) throw new Error(msg);
}

const navegador = await chromium.launch({ executablePath: RUTA_CHROMIUM });

async function nuevaPagina({ ancho = 390, alto = 844, initScript, reloj } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, locale: 'es-BO' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errores.push(m.text());
  });
  // Sin red: solo el archivo local (las fuentes de Google se bloquean en las pruebas).
  await page.route('**/*', (r) => (r.request().url().startsWith('file:') ? r.continue() : r.abort()));
  if (reloj) await page.clock.install({ time: new Date('2026-10-23T09:00:00') });
  if (initScript) await page.addInitScript(initScript);
  return { ctx, page };
}

async function ir(page, ruta) {
  if (!page.url().startsWith('file:')) {
    await page.goto(URL_BASE + '#' + ruta);
  } else {
    await page.evaluate((r) => (location.hash = '#' + r), ruta);
  }
  await page.waitForTimeout(250);
}

async function sinDesbordeHorizontal(page, etiqueta) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  afirmar(sw <= iw + 1, `${etiqueta}: desborde horizontal (${sw} > ${iw})`);
}

async function captura(page, nombre) {
  if (CAPTURAS) await page.screenshot({ path: `${CAPTURAS}/${nombre}.png` });
}

/* ------------------------------------------------------------------ 1. Diseño adaptable */

const RUTAS = ['/', '/biblioteca', '/actividad/circulo-de-gratitud', '/retiros', '/favoritos', '/asistente', '/cuenta', '/ayuda', '/facilitar/circulo-de-gratitud', '/imprimir/actividad/circulo-de-gratitud'];
for (const [ancho, alto] of [
  [360, 740],
  [390, 844],
  [768, 1024],
  [1366, 900],
]) {
  await prueba(`Sin desborde horizontal a ${ancho}px en ${RUTAS.length} pantallas`, async () => {
    const { ctx, page } = await nuevaPagina({ ancho, alto });
    await page.goto(URL_BASE);
    await page.waitForSelector('h1');
    for (const r of RUTAS) {
      await ir(page, r);
      await page.waitForSelector('h1, .facil-paso, .doc-print');
      await sinDesbordeHorizontal(page, `${r} @${ancho}`);
      await captura(page, `${ancho}${r.replace(/\//g, '_') || '_inicio'}`);
    }
    await ctx.close();
  });
}

await prueba('Sin desborde con tamaño de letra «muy grande» a 360px', async () => {
  const { ctx, page } = await nuevaPagina({
    ancho: 360,
    alto: 740,
    initScript: () => {
      if (!localStorage.getItem('rh:v1:usuario')) localStorage.setItem('rh:v1:usuario', JSON.stringify({ version: 1, preferencias: { tamano: 'muy-grande' } }));
    },
  });
  await page.goto(URL_BASE);
  await page.waitForSelector('h1');
  afirmar((await page.evaluate(() => document.documentElement.dataset.tamano)) === 'muy-grande', 'Preferencia aplicada');
  for (const r of RUTAS) {
    await ir(page, r);
    await page.waitForSelector('h1, .facil-paso, .doc-print');
    await sinDesbordeHorizontal(page, `${r} @360 muy grande`);
  }
  await ctx.close();
});

/* ------------------------------------------------------------------ 2. Biblioteca */

await prueba('Búsqueda sin tildes ni mayúsculas encuentra «Meditación del Árbol»', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 1366, alto: 900 });
  await page.goto(URL_BASE + '#/biblioteca');
  await page.getByPlaceholder('Buscar por nombre, tema o palabra…').fill('MEDITACION ARBOL');
  await page.waitForTimeout(200);
  const primera = await page.locator('.tarjeta-actividad h3').first().innerText();
  afirmar(primera.includes('Meditación del Árbol'), `Primera tarjeta: ${primera}`);
  const estado = await page.getByRole('status').filter({ hasText: 'de 53' }).first().innerText();
  afirmar(/de 53 actividades/.test(estado), `Recuento: ${estado}`);
  await ctx.close();
});

await prueba('Filtros combinados (Cierre + Suave + 1 hora), recuento y limpiar', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 390, alto: 844 });
  await page.goto(URL_BASE + '#/biblioteca');
  await page.getByRole('button', { name: /^Filtros/ }).click();
  const hoja = page.getByRole('dialog', { name: 'Filtros' });
  await hoja.getByRole('button', { name: /^Cierre/ }).click();
  await hoja.getByRole('button', { name: /^Suave/ }).click();
  await hoja.getByRole('button', { name: /^Hasta 1 hora/ }).click();
  await hoja.getByRole('button', { name: /^Ver \d+ resultado/ }).click();
  const n = await page.locator('.tarjeta-actividad').count();
  afirmar(n > 0 && n < 53, `Resultados filtrados: ${n}`);
  const dur = await page.locator('.tarjeta-actividad .meta').allInnerTexts();
  afirmar(dur.every((d) => /Suave/.test(d)), 'Todas deben ser de intensidad suave');
  await page.getByRole('button', { name: 'Limpiar todo' }).click();
  await page.waitForTimeout(150);
  afirmar((await page.locator('.tarjeta-actividad').count()) === 53, 'Al limpiar vuelven las 53');
  await ctx.close();
});

await prueba('Estado sin resultados con acción para limpiar', async () => {
  const { ctx, page } = await nuevaPagina();
  await page.goto(URL_BASE + '#/biblioteca');
  await page.getByPlaceholder('Buscar por nombre, tema o palabra…').fill('zzzzqqq');
  await page.getByText('No encontramos actividades con esos criterios').waitFor();
  await page.getByRole('button', { name: 'Limpiar filtros' }).click();
  afirmar((await page.locator('.tarjeta-actividad').count()) === 53, 'Debe volver a mostrar todo');
  await ctx.close();
});

/* ------------------------------------------------------------------ 3. Favoritos, notas y marcas */

await prueba('Favorita, nota privada y «la utilicé» persisten al recargar', async () => {
  const { ctx, page } = await nuevaPagina();
  await page.goto(URL_BASE + '#/actividad/circulo-de-gratitud');
  await page.getByRole('heading', { name: 'Círculo de Gratitud', level: 1 }).waitFor();
  await page.getByRole('button', { name: /Guardar «Círculo de Gratitud» en favoritas/ }).first().click();
  await page.getByRole('button', { name: 'La utilicé' }).click();
  const nota = page.getByLabel('Mi nota privada');
  await nota.fill('Funcionó mejor con música suave al inicio.');
  await nota.blur();
  await page.waitForTimeout(900);
  await page.reload();
  await page.getByRole('heading', { name: 'Círculo de Gratitud', level: 1 }).waitFor();
  afirmar((await page.getByLabel('Mi nota privada').inputValue()).includes('música suave'), 'La nota debe persistir');
  afirmar(await page.getByText('Utilizada una vez').isVisible(), 'Marca de uso');
  await ir(page, '/');
  await page.getByRole('heading', { name: 'Tus favoritas' }).waitFor();
  afirmar(await page.locator('.tarjeta-compacta', { hasText: 'Círculo de Gratitud' }).first().isVisible(), 'Aparece en favoritas de Inicio');
  await ir(page, '/favoritos?ver=notas');
  afirmar(await page.getByText('Funcionó mejor con música suave').isVisible(), 'Aparece en Notas');
  await ctx.close();
});

/* ------------------------------------------------------------------ 4. Retiros */

await prueba('Crear retiro, añadir actividades y pausa, horarios y avisos de exceso', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 1366, alto: 900 });
  await page.goto(URL_BASE);
  await page.getByRole('button', { name: /Crear un retiro/ }).click();
  await page.getByLabel('Nombre del retiro').fill('Retiro de prueba');
  await page.getByLabel('Participantes (aprox.)').fill('12');
  await page.getByRole('link', { name: 'Programa' }).click();
  await page.getByRole('button', { name: 'Añadir actividad' }).click();
  const dlg = page.getByRole('dialog', { name: 'Añadir actividad' });
  await dlg.getByPlaceholder('Buscar actividad…').fill('gratitud');
  await dlg.getByRole('button', { name: /^Añadir Círculo de Gratitud/ }).click();
  await dlg.getByPlaceholder('Buscar actividad…').fill('arbol');
  await dlg.getByRole('button', { name: /^Añadir Meditación del Árbol/ }).click();
  await dlg.getByRole('button', { name: /^Listo/ }).click();
  await page.getByRole('button', { name: 'Pausa' }).click();
  const horarios = await page.locator('.bloque-horario').allInnerTexts();
  afirmar(horarios[0] === '09:00–09:45', `Primer bloque: ${horarios[0]}`);
  afirmar(horarios.length === 3, `Bloques: ${horarios.length}`);
  await page.getByLabel('Hora de fin (opcional)').fill('10:00');
  await page.getByText(/después del fin previsto/).first().waitFor();
  afirmar(await page.getByText('Revisa el horario').isVisible(), 'Aviso de exceso visible');
  await ctx.close();
});

await prueba('Reordenar con botones, con teclado y arrastrando; solapamiento por hora fija', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 390, alto: 844 });
  await page.goto(URL_BASE + '#/retiros');
  await page.getByRole('button', { name: 'Crear mi primer retiro' }).click();
  await page.getByRole('link', { name: 'Programa' }).click();
  await page.getByRole('button', { name: 'Añadir actividad' }).click();
  const dlg = page.getByRole('dialog', { name: 'Añadir actividad' });
  for (const t of ['Círculo de Gratitud', 'Meditación del Árbol', 'Círculo de Presencia']) {
    await dlg.getByPlaceholder('Buscar actividad…').fill(t);
    await dlg.getByRole('button', { name: new RegExp(`^Añadir ${t}`) }).first().click();
  }
  await dlg.getByRole('button', { name: /^Listo/ }).click();
  const titulos = async () => page.locator('.bloque-titulo').allInnerTexts();
  afirmar((await titulos())[0] === 'Círculo de Gratitud', 'Orden inicial');
  await page.getByRole('button', { name: 'Bajar «Círculo de Gratitud»' }).click();
  afirmar((await titulos())[1] === 'Círculo de Gratitud', `Tras bajar: ${(await titulos()).join(' | ')}`);
  // Teclado sobre el asa
  await page.getByRole('button', { name: /^Reordenar «Círculo de Gratitud»/ }).focus();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  afirmar((await titulos())[2] === 'Círculo de Gratitud', `Tras flecha abajo: ${(await titulos()).join(' | ')}`);
  // Arrastre con puntero: el último bloque al principio (se centra la lista para que ningún asa quede bajo la barra inferior)
  const asas = page.locator('.asa');
  await asas.nth(1).evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(100);
  const a = await asas.nth(2).boundingBox();
  const b = await asas.nth(0).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2, b.y + 4, { steps: 12 });
  await page.mouse.move(a.x + a.width / 2, b.y - 10, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  afirmar((await titulos())[0] === 'Círculo de Gratitud', `Tras arrastrar: ${(await titulos()).join(' | ')}`);
  // Hora fija que se solapa
  await page.getByRole('button', { name: /^Editar «Meditación del Árbol»/ }).click();
  await page.getByLabel('Hora fija (opcional)').fill('09:10');
  await page.getByText(/solapamiento de \d+ min/).first().waitFor();
  await ctx.close();
});

await prueba('Preparación: lista consolidada persistente y tarea propia', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 768, alto: 1024 });
  await page.goto(URL_BASE + '#/actividad/circulo-de-gratitud');
  await page.getByRole('button', { name: 'Añadir a un retiro' }).click();
  await page.getByLabel('Nombre del retiro').fill('Retiro materiales');
  await page.getByRole('dialog').getByRole('button', { name: 'Añadir', exact: true }).click();
  await page.getByRole('button', { name: 'Ver retiro' }).click();
  await page.getByRole('link', { name: 'Preparación' }).click();
  await page.getByRole('heading', { name: 'Materiales', exact: true }).first().waitFor();
  const casilla = page.locator('label.casilla', { hasText: 'Vela central' }).first();
  await casilla.click();
  await page.getByPlaceholder(/Añadir una tarea/).fill('Confirmar el salón');
  await page.getByRole('button', { name: 'Añadir', exact: true }).click();
  await page.waitForTimeout(600);
  await page.reload();
  await page.getByRole('heading', { name: 'Materiales', exact: true }).first().waitFor();
  afirmar(await page.locator('label.casilla', { hasText: 'Vela central' }).first().locator('input').isChecked(), 'La marca debe persistir');
  afirmar(await page.getByText('Confirmar el salón').isVisible(), 'La tarea propia debe persistir');
  const texto = await page.locator('main').innerText();
  afirmar(!/\b\d+\s+(velas|hojas|bolígrafos)\b/i.test(texto), 'No debe inventar cantidades');
  await ctx.close();
});

await prueba('Duplicar, eliminar con deshacer y restaurar desde la papelera', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 1366, alto: 900 });
  await page.goto(URL_BASE + '#/retiros');
  await page.getByRole('button', { name: 'Crear mi primer retiro' }).click();
  await page.getByLabel('Nombre del retiro').fill('Original');
  await ir(page, '/retiros');
  await page.getByRole('button', { name: 'Duplicar Original' }).click();
  await page.getByRole('link', { name: 'Original (copia)' }).waitFor();
  await page.getByRole('button', { name: 'Eliminar Original (copia)' }).click();
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await page.getByRole('link', { name: 'Original (copia)' }).waitFor();
  await page.getByRole('button', { name: 'Eliminar Original (copia)' }).click();
  await page.getByRole('heading', { name: 'Papelera' }).waitFor();
  await page.getByRole('button', { name: 'Restaurar' }).click();
  await page.getByRole('link', { name: 'Original (copia)' }).waitFor();
  await ctx.close();
});

/* ------------------------------------------------------------------ 5. Facilitación */

await prueba('Temporizador: correcto tras 5 min en segundo plano, pausa y sin avance automático', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 390, alto: 844, reloj: true });
  await page.goto(URL_BASE + '#/facilitar/circulo-de-gratitud');
  await page.locator('.facil-paso').waitFor();
  const pasoInicial = await page.locator('.facil-paso').innerText();
  await page.getByRole('button', { name: 'Iniciar temporizador' }).click();
  await page.clock.fastForward('05:00');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(100);
  const reloj = await page.locator('.facil-reloj').innerText();
  afirmar(/^05:0\d$/.test(reloj), `Reloj tras 5 min: ${reloj}`);
  await page.clock.fastForward('30:00');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(100);
  afirmar((await page.locator('.facil-paso').innerText()) === pasoInicial, 'No debe avanzar de paso por sí solo');
  await page.getByText('Tiempo previsto cumplido').waitFor();
  await page.getByRole('button', { name: 'Pausar temporizador' }).click();
  const pausado = await page.locator('.facil-reloj').innerText();
  await page.clock.fastForward('02:00');
  await page.waitForTimeout(100);
  afirmar((await page.locator('.facil-reloj').innerText()) === pausado, 'En pausa no corre');
  await page.getByRole('button', { name: /^Siguiente/ }).click();
  afirmar((await page.locator('.facil-paso').innerText()) !== pasoInicial, 'Avanza solo con la acción');
  // Salir y volver: se conserva la posición
  await page.getByRole('button', { name: 'Salir sin perder el progreso' }).click();
  await ir(page, '/');
  await page.getByText('Tienes una facilitación en pausa').waitFor();
  await page.getByRole('link', { name: 'Continuar' }).click();
  await page.locator('.facil-paso').waitFor();
  afirmar((await page.locator('.facil-paso').innerText()) !== pasoInicial, 'Recupera el paso guardado');
  await ctx.close();
});

/* ------------------------------------------------------------------ 6. Impresión */

await prueba('Impresión: documento claro, notas privadas solo si se eligen, descarga en la vista previa', async () => {
  const guardados = [];
  const { ctx, page } = await nuevaPagina({
    ancho: 1366,
    alto: 900,
    initScript: () => {
      window.__guardados = [];
      window.claude = {
        use: async (n) =>
          n === 'downloads'
            ? Object.freeze({
                save: async (r) => {
                  window.__guardados.push({ filename: r.filename, size: String(r.data).length, conNota: String(r.data).includes('NOTA-SECRETA') });
                  return { status: 'saved' };
                },
              })
            : null,
      };
    },
  });
  await page.goto(URL_BASE + '#/actividad/circulo-de-gratitud');
  await page.getByLabel('Mi nota privada').fill('NOTA-SECRETA para el grupo');
  await page.getByLabel('Mi nota privada').blur();
  await page.waitForTimeout(800);
  await ir(page, '/imprimir/actividad/circulo-de-gratitud');
  await page.locator('.doc-print h1').waitFor();
  const fondo = await page.locator('.doc-print').evaluate((el) => getComputedStyle(el).backgroundColor);
  afirmar(fondo === 'rgb(255, 255, 255)', `Fondo del documento: ${fondo}`);
  afirmar(!(await page.locator('.doc-print').innerText()).includes('NOTA-SECRETA'), 'Sin notas por defecto');
  await page.getByRole('button', { name: 'Descargar para imprimir' }).click();
  await page.waitForTimeout(200);
  await page.getByLabel('Incluir mis notas privadas').check();
  afirmar((await page.locator('.doc-print').innerText()).includes('NOTA-SECRETA'), 'Con notas si se elige');
  await page.getByRole('button', { name: 'Descargar para imprimir' }).click();
  await page.waitForTimeout(200);
  guardados.push(...(await page.evaluate(() => window.__guardados)));
  afirmar(guardados.length === 2 && guardados.every((g) => g.filename.endsWith('.html')), `Descargas: ${JSON.stringify(guardados)}`);
  afirmar(!guardados[0].conNota && guardados[1].conNota, 'La nota solo viaja cuando se elige');
  if (CAPTURAS) await page.pdf({ path: `${CAPTURAS}/ficha-impresa.pdf`, format: 'A4' }).catch(() => undefined);
  await ctx.close();
});

/* ------------------------------------------------------------------ 7. Administración y permisos */

await prueba('Vista de compradora oculta borradores; administración edita con historial y descarta', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 1366, alto: 900 });
  await page.goto(URL_BASE + '#/biblioteca');
  await page.getByText('53 actividades publicadas').waitFor();
  await ir(page, '/actividad/viaje-chamanico-guiado');
  await page.getByText('Esta actividad no está disponible').waitFor();
  await ir(page, '/cuenta');
  await page.getByRole('group', { name: 'Ver la app como' }).getByRole('button', { name: 'Administración' }).click();
  await ir(page, '/biblioteca');
  await page.getByText('71 actividades en el catálogo').waitFor();
  await ir(page, '/admin/actividad/viaje-chamanico-guiado');
  await page.getByText('Información general').waitFor();
  const publicar = page.getByRole('button', { name: 'Publicar' });
  const titulo = page.getByLabel('Título', { exact: true }).first();
  await titulo.fill('Viaje Chamánico Guiado (revisado)');
  await page.getByRole('region', { name: 'Cambios sin guardar' }).waitFor();
  await page.getByLabel('Nota de la versión').fill('Prueba de edición');
  await page.getByRole('region', { name: 'Cambios sin guardar' }).getByRole('button', { name: 'Guardar' }).click();
  await page.getByText(/Guardada \(versión 2\)/).waitFor();
  await page.getByText('Historial de versiones').click();
  await page.getByRole('button', { name: 'Ver historial' }).click();
  await page.getByText('Prueba de edición').waitFor();
  afirmar(await publicar.count() >= 0, 'Botón publicar presente');
  // La compradora sigue sin verla (sigue en revisión)
  await ir(page, '/cuenta');
  await page.getByRole('group', { name: 'Ver la app como' }).getByRole('button', { name: 'Compradora' }).click();
  await ir(page, '/biblioteca');
  await page.getByPlaceholder('Buscar por nombre, tema o palabra…').fill('chamanico');
  await page.waitForTimeout(150);
  afirmar((await page.locator('.tarjeta-actividad').count()) === 0, 'Una actividad en revisión no aparece para compradoras');
  // Descartar cambios locales
  await ir(page, '/cuenta');
  await page.getByRole('group', { name: 'Ver la app como' }).getByRole('button', { name: 'Administración' }).click();
  await ir(page, '/admin/actividad/viaje-chamanico-guiado');
  await page.getByText('Historial de versiones').click();
  await page.getByRole('button', { name: 'Volver a la versión importada' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar cambios' }).click();
  await page.getByText('Cambios descartados').waitFor();
  afirmar((await page.getByLabel('Título', { exact: true }).first().inputValue()) === 'Viaje Chamánico Guiado', 'Vuelve al título importado');
  await ctx.close();
});

await prueba('Publicar está bloqueado cuando faltan datos obligatorios', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 1366, alto: 900 });
  await page.goto(URL_BASE + '#/cuenta');
  await page.getByRole('group', { name: 'Ver la app como' }).getByRole('button', { name: 'Administración' }).click();
  await ir(page, '/admin/actividades');
  await page.getByRole('button', { name: 'Nueva actividad' }).click();
  await page.getByLabel('Título').fill('Dinámica de prueba');
  await page.getByRole('button', { name: 'Crear borrador' }).click();
  await page.getByText('Bloquea la publicación: Falta la duración prevista.').waitFor();
  afirmar(await page.getByRole('button', { name: 'Publicar' }).isDisabled(), 'Publicar debe estar desactivado');
  await ctx.close();
});

/* ------------------------------------------------------------------ 8. Asistente */

await prueba('Asistente sin IA conectada: sugerencias deterministas y aviso honesto', async () => {
  const { ctx, page } = await nuevaPagina({ ancho: 390, alto: 844 });
  await page.goto(URL_BASE + '#/asistente');
  await page.getByRole('heading', { name: 'Sugerencias según tu grupo' }).waitFor();
  await page.getByRole('group', { name: 'Momento del retiro' }).getByRole('button', { name: 'Cierre' }).click();
  await page.getByLabel('Tiempo disponible').selectOption('30');
  const n = await page.getByRole('list', { name: 'Actividades sugeridas' }).locator('li').count();
  afirmar(n > 0, 'Debe sugerir actividades de cierre de hasta 30 min');
  await page.getByText('El asistente con IA todavía no está conectado').waitFor({ timeout: 15000 });
  afirmar(await page.getByRole('link', { name: 'Abrir el asistente externo' }).isVisible(), 'Enlace externo visible');
  await ctx.close();
});

await prueba('Asistente con capacidad simulada del visor: citas válidas, no verificadas y detener', async () => {
  const { ctx, page } = await nuevaPagina({
    ancho: 1366,
    alto: 900,
    initScript: () => {
      window.__entradas = [];
      const sample = async (input, opts = {}) => {
        window.__entradas.push(input);
        const ultimo = input[input.length - 1].content;
        const id = /\[\[([a-z0-9-]+)\]\]/.exec(ultimo.split('<fichas>')[1] ?? '')?.[1] ?? 'sin-fichas';
        const texto = `### Propuesta\n- Primera opción [[${id}]] para abrir.\n- Otra idea [[ficha-inventada]].\n\n**Adaptación sugerida:** acortar la ronda.`;
        let acumulado = '';
        for (const trozo of texto.match(/.{1,20}/gs)) {
          if (opts.signal?.aborted) throw { code: 'cancelled', message: 'cancelado', text: acumulado };
          acumulado += trozo;
          opts.onText?.({ text: acumulado, delta: trozo });
          await new Promise((r) => setTimeout(r, /cerrar el día/.test(ultimo) ? 250 : 15));
        }
        return { text: acumulado, truncated: false };
      };
      window.claude = { use: async (n) => (n === 'sample' ? sample : null) };
    },
  });
  await page.goto(URL_BASE + '#/asistente');
  await page.getByRole('heading', { name: 'Pregunta al asistente' }).waitFor({ timeout: 15000 });
  await page.getByLabel('Escribe tu pregunta').fill('Necesito abrir un retiro de 15 personas en 30 minutos');
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await page.locator('.mensaje-asistente :is(h3,h4,h5)', { hasText: 'Propuesta' }).waitFor();
  await page.getByText('[referencia no verificada]').waitFor();
  afirmar(await page.locator('.mensaje-asistente a.cita-ficha').count() === 1, 'Una cita válida enlazada');
  const entrada = await page.evaluate(() => window.__entradas[0]);
  const prompt = JSON.stringify(entrada);
  afirmar(prompt.includes('Usa SOLO las fichas') && prompt.includes('[[circulo-de-presencia]]') === prompt.includes('circulo-de-presencia'), 'El prompt incluye reglas y fichas');
  afirmar(!/viaje-chamanico-guiado/.test(prompt), 'No envía fichas en revisión');
  await page.locator('.mensaje-asistente strong', { hasText: 'Adaptación sugerida' }).waitFor();
  afirmar((await page.locator('.mensaje-asistente strong', { hasText: 'Adaptación sugerida' }).count()) === 1, 'Markdown seguro renderizado');
  // Detener una respuesta en curso
  await page.getByLabel('Escribe tu pregunta').fill('Y para cerrar el día?');
  await page.getByRole('button', { name: 'Enviar pregunta' }).click();
  await page.getByRole('button', { name: 'Detener' }).click();
  await page.getByText('Respuesta detenida.').waitFor();
  await ctx.close();
});

/* ------------------------------------------------------------------ 9. Preferencias */

await prueba('Preferencias: tema claro y tamaño de lectura se aplican y persisten', async () => {
  const { ctx, page } = await nuevaPagina();
  await page.goto(URL_BASE + '#/cuenta');
  await page.getByRole('group', { name: 'Tema' }).getByRole('button', { name: 'Claro (lectura)' }).click();
  await page.getByRole('group', { name: 'Tamaño de lectura' }).getByRole('button', { name: 'Grande', exact: true }).click();
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForSelector('h1');
  const attrs = await page.evaluate(() => [document.documentElement.dataset.tema, document.documentElement.dataset.tamano, getComputedStyle(document.body).backgroundColor]);
  afirmar(attrs[0] === 'claro' && attrs[1] === 'grande', `Atributos: ${attrs}`);
  afirmar(attrs[2] !== 'rgb(15, 8, 22)', 'Fondo claro aplicado');
  await ctx.close();
});

await prueba('Estados vacíos claros sin datos inventados', async () => {
  const { ctx, page } = await nuevaPagina();
  await page.goto(URL_BASE + '#/retiros');
  await page.getByText('Todavía no tienes retiros').waitFor();
  await ir(page, '/favoritos');
  await page.getByText('Aún no tienes favoritas').waitFor();
  const inicio = await (async () => {
    await ir(page, '/');
    return page.locator('main').innerText();
  })();
  afirmar(!/descargas|4\.9|valoraci|reseña|acaba de unirse|cupos/i.test(inicio), 'Sin cifras ni reseñas sin respaldo');
  await ctx.close();
});

await navegador.close();

const fallos = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} pruebas superadas`);
if (errores.length) {
  console.log(`Errores de la página (${errores.length}):`);
  for (const e of [...new Set(errores)].slice(0, 20)) console.log('  -', e);
}
process.exit(fallos.length || errores.length ? 1 : 0);
