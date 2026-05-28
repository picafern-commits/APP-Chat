const CACHE = 'so-nos-v3';
const ASSETS = ['./','./index.html','./style.css','./app.js','./manifest.json','./icon-192.png','./icon-512.png'];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(windows => {
    const openWindow = windows.find(windowClient => 'focus' in windowClient);
    return openWindow ? openWindow.focus() : clients.openWindow('./index.html');
  }));
});
