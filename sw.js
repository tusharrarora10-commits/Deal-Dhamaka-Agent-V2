/* Deal Dhamaka Agent V2 — conservative offline cache.
   Dashboard visuals only; preserve app storage and all existing workflows.
   Do not delete unrelated caches on this origin during activation. */
const CACHE = 'deal-dhamaka-v13-full-dark-mode';

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './whatsapp-enhancements.js',
  './dashboard.js',
  './followup.js',
  './bulk-followups.js',
  './undo-redo.js',
  './recipients-tab.js',
  './refunds.js',
  './product-status.js',
  './analytics.js',
  './recipient-timeline.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  // Intentionally do not delete other caches: this avoids disrupting another
  // app/deployment sharing the same origin.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached =>
        cached || caches.match('./index.html')
      ))
  );
});
