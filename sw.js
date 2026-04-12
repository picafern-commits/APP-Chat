const CACHE_NAME = 'so-nos-cache-v2-roxo';
const URLS = ['./', './index.html', './style.css', './app.js', './manifest.json', './firebase-config.js'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS)));
});

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});
