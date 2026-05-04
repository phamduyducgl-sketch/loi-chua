// Service worker for Lời Chúa PWA
// Strategy: cache-first for app shell; network-first (no cache) for Bible API.
// Bump CACHE_VERSION whenever you ship updates so users get the new build.

const CACHE_VERSION = 'loi-chua-v6';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Always go to network for Bible API calls (don't pollute cache; need fresh data).
  if (url.hostname === 'api.getbible.net' || url.hostname === 'bolls.life') {
    return; // let browser handle it normally
  }

  // Cache-first for everything in the app shell / same origin.
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        // Only cache same-origin successful responses
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback: serve the main HTML for navigations
        if (req.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});
