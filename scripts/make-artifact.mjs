/**
 * Convierte la compilación `vite build --mode artifact` en el contenido de una página para la vista previa en claude.ai:
 *  - sin doctype/html/head/body (el visor añade el esqueleto),
 *  - con <title>, meta de márgenes seguros y fuentes de Google Fonts,
 *  - React 18.3.1 (UMD de producción) incrustado desde node_modules, sin dependencias externas de scripts.
 * Uso: node scripts/make-artifact.mjs  → dist-artifact/retiros-holisticos.html (+ preview-local.html para pruebas)
 */
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('dist-artifact/artifact.html', 'utf8');
const estilos = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (scripts.length !== 1) throw new Error(`Se esperaba un único script en la compilación y hay ${scripts.length}`);
const app = scripts[0].replace(/<\/script/gi, '<\\/script');
const react = readFileSync('node_modules/react/umd/react.production.min.js', 'utf8');
const reactDom = readFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'utf8');
const version = JSON.parse(readFileSync('node_modules/react/package.json', 'utf8')).version;
if (version !== '18.3.1') throw new Error(`Versión de React inesperada: ${version}`);

const contenido = `<title>Retiros Holísticos</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Tu espacio para preparar y facilitar experiencias con intención.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,600;0,700;1,600&display=swap">
<style>${estilos}</style>
<div id="root"></div>
<noscript>Esta aplicación necesita JavaScript activado.</noscript>
<script>${react}</script>
<script>${reactDom}</script>
<script>${app}</script>
`;

writeFileSync('dist-artifact/retiros-holisticos.html', contenido);
// Copia con esqueleto completo solo para pruebas locales (Playwright).
writeFileSync(
  'dist-artifact/preview-local.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>${contenido}</body></html>`,
);
console.log(`retiros-holisticos.html: ${(contenido.length / 1024).toFixed(0)} KB`);
