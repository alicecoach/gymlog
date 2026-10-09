// Network-first: si hay conexión, usa la última versión; si no, la copia en caché.
const CACHE = 'gymlog-v22';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/data/machines.js', 'js/data/lucide.js', 'js/data/icons.js', 'js/data/demos.js', 'js/data/tech.js', 'js/data/presets.js', 'js/store.js', 'js/progression.js',
  'js/generator.js', 'js/quick.js', 'js/nutrition.js', 'js/cycle.js', 'js/activity.js', 'js/warmup.js', 'js/app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
