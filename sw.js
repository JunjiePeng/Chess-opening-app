/* Debut service worker — makes the app genuinely work offline.
   Strategy: network-first for the page (updates always win when online, cache
   answers when offline); cache-first for icons/manifest; cache-first for the
   Google Fonts files so the Organic typography survives offline after the
   first online load (fonts are loaded async, so a blocked/offline font host
   never delays rendering). Other cross-origin requests (the Stockfish CDN)
   are left untouched — the engine degrades gracefully offline.
   Bump CACHE together with the build tag in index.html when releasing. */
const CACHE = 'debut-g22';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SHELL = ['./', './index.html', './manifest.webmanifest?v=G18', './icon-192.png?v=G20', './icon-512.png?v=G18', './apple-touch-icon.png?v=G18', './favicon-32.png?v=G18', './favicon.svg?v=G22'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (FONT_HOSTS.includes(url.hostname)) {
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  if (e.request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy));
      return res;
    }))
  );
});
