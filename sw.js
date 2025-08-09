const CACHE_NAME = 'sedapal-pwa-v13';
const urlsToCache = [
    './',
    './index.html',
    './sedapal-api.js',
    './main.js',
    './manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
});

// Activar Service Worker
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Interceptar requests
self.addEventListener('fetch', e => {
  const u = e.request.url || '';
  if (u.startsWith('https://sedapal-backend.onrender.com')) {
    e.respondWith(fetch(e.request)); // siempre red para la API
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});