/* Service worker de Retiros Holísticos (solo hosting propio).
 * - Guarda la estructura de la app para abrirla sin conexión.
 * - Nunca guarda respuestas de la API, de Supabase ni de otros dominios (datos personales y contenido protegido).
 * - La copia sin conexión de las fichas de un retiro se guarda con el propio retiro (datos del usuario), no aquí. */
const VERSION = 'rh-v1';
const ESENCIALES = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ESENCIALES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Navegación: red primero (para recibir versiones nuevas) y copia guardada si no hay conexión.
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copia = r.clone();
          caches.open(VERSION).then((c) => c.put('./index.html', copia));
          return r;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }
  // Recursos estáticos con huella (assets/*): caché primero.
  if (url.pathname.includes('/assets/') || ESENCIALES.some((p) => url.pathname.endsWith(p.replace('./', '/')))) {
    e.respondWith(
      caches.match(e.request).then(
        (r) =>
          r ||
          fetch(e.request).then((resp) => {
            if (resp.ok) {
              const copia = resp.clone();
              caches.open(VERSION).then((c) => c.put(e.request, copia));
            }
            return resp;
          }),
      ),
    );
  }
});
