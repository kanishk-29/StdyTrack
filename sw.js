// Minimal offline cache for Study Tracker.
// All real data lives in localStorage, not in this cache — this only
// lets the app shell (html/css/js/icons) load when there's no connection.

const CACHE_NAME = 'study-tracker-shell-v14';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
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
  './assets/mascot/1. HAPPY - NORMAL STUDY SUCCESS.png',
  './assets/mascot/2_PLAYFUL - TEASING.png',
  './assets/mascot/3. PROUD - 6+ HOURS.png',
  './assets/mascot/4. FLIRTY - HARD WORK.png',
  './assets/mascot/5. GRUMPY - LESS THAN 2 HOURS.png',
  './assets/mascot/6. DISAPPOINTED - MISSED GOAL.png',
  './assets/mascot/7. ANNOYED - SUBJECT IGNORED.png',
  './assets/mascot/8. FOCUSED - DEEP STUDY.png',
  './assets/mascot/9. SOFTWARE ENGINEERING  CODING.png',
  './assets/mascot/10. MATHEMATICS - THINKING.png',
  './assets/mascot/11. RESEARCH MODE.png',
  './assets/mascot/12. MOTIVATIONAL GET BACK TO WORK.png',
  './assets/mascot/13. CELEBRATION - BIG ACHIEVEMENT.png',
  './assets/mascot/14. SLEEPY - LATE NIGHT.png',
  './assets/mascot/15. TIRED - AFTER LONG SESSION.png',
  './assets/mascot/16. CONFUSED - DIFFICULT TOPIC.png',
  './assets/mascot/17. ANALYTICS  AI MODE.png',
  './assets/mascot/18. COMEBACK - AFTER SEVERAL DAYS.png',
  './assets/mascot/19. COFFEE BREAK - RELAXED.png',
  './assets/mascot/20. I\'M WATCHING YOU PROCRASTINATION DETECTED.png',
  './assets/mascot/21. BRO REALLY.png',
  './assets/mascot/22. YOU DID WHAT.png',
  './assets/mascot/23. I\'M NOT MAD... I\'M MAD.png',
  './assets/mascot/24. CAUGHT YOU.png',
  './assets/mascot/25. MY BRAIN HAS LEFT THE CHAT.png',
  './assets/mascot/26. EXCUSE ME.png',
  './assets/mascot/27. I CAN\'T BELIEVE YOU.png',
  './assets/mascot/28. OH, YOU\'RE DONE.png',
  './assets/mascot/29. I AM SO PROUD OF YOU.png',
  './assets/mascot/30. WHY ARE YOU LIKE THIS.png',
  './assets/mascot/31. CAUGHT YOU SCROLLING.png',
  './assets/mascot/32. 7-DAY STREAK.png',
  './assets/mascot/33. FAILED QUIZ.png',
  './assets/mascot/34. DIFFICULT TOPIC DEFEATED.png',
  './assets/mascot/35. 10 DAYS AWAY FROM A SUBJECT.png',
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
      .then((cache) => cache.addAll(APP_SHELL))
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
// cache when offline.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html')))
  );
});
