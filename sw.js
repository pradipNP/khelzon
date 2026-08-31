const CACHE = 'khelzon-v4';
const ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/games.css',
  './js/app.js',
  './js/theme.js',
  './js/sound.js',
  './js/shortcutsHelp.js',
  './js/resetScoresModal.js',
  './js/share.js',
  './js/requestGame.js',
  './js/pwa.js',
  './js/sync.js',
  './js/lobby.js',
  './js/router.js',
  './js/storage.js',
  './js/gameRegistry.js',
  './js/gameFit.js',
  './js/users.js',
  './manifest.json',
  './assets/og-image.png',
  './js/games/marble-solo.js',
  './js/games/snake-rush.js',
  './js/games/cascade.js',
  './js/games/memory-matrix.js',
  './js/games/orbit-breaker.js',
  './js/games/star-drift.js',
  './js/games/tap-sequence.js',
  './js/games/territory-clash.js',
  './js/games/neon-dodge.js',
  './js/games/slide-quest.js',
  './js/games/meteor-run.js',
  './js/games/target-tap.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetched = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
