const CACHE_NAME = 'sedapal-pwa-v7';
const urlsToCache = [
    './',
    './index.html',
    './sedapal-api.js',
    './main.js',
    './manifest.json'
];

// Instalar Service Worker
self.addEventListener('install', function(event) {
    console.log('🔧 Service Worker: Instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('📦 Service Worker: Cache abierto');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activar Service Worker
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  console.log('✅ Service Worker: Activado');
});

// Interceptar requests
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});

// Escuchar mensajes
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});