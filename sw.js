// Minimal offline cache for Study Tracker.
// All real data lives in localStorage, not in this cache ???????? this only
// lets the app shell (html/css/js/icons) load when there's no connection.

const CACHE_NAME = 'study-tracker-shell-v25';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './css/base.css',
  './css/habit-tracker.css',
  './css/header-search.css',
  './css/today-calendar.css',
  './css/calendar-popover.css',
  './css/timer.css',
  './css/sidebar.css',
  './css/subject-detail.css',
  './css/exam-pacing.css',
  './css/tooltip-footer.css',
  './css/modal.css',
  './css/today-planner.css',
  './css/lecture-notes.css',
  './css/analytics.css',
  './css/focus-mode.css',
  './css/login.css',
  './css/mascot.css',
  './css/dark-mode.css',
  './css/a11y.css',
  './js/data.js',
  './js/today-and-folders.js',
  './js/cloud-sync.js',
  './js/storage.js',
  './js/settings.js',
  './js/time-tracking.js',
  './js/exam-scores.js',
  './js/render.js',
  './js/dashboard.js',
  './js/calendar.js',
  './js/tooltip.js',
  './js/lecture-notes.js',
  './js/actions.js',
  './js/test-score-actions.js',
  './js/modals.js',
  './js/exam-date.js',
  './js/init.js',
  './js/mascot.js',
  './js/login.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.allSettled(APP_SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for app files so updates show up promptly; falls back to
// cache when offline. Images never fall back to index.html (that would
// serve HTML bytes for a broken <img>); they just use the cache or fail.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.destination !== 'image' && event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
        return Response.error();
      })
  );
});