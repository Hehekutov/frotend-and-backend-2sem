const APP_SHELL_CACHE = 'app-shell-v3';
const DYNAMIC_CACHE = 'dynamic-content-v2';
const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './content/home.html',
  './content/about.html',
  './icons/favicon.ico',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './icons/favicon-64x64.png',
  './icons/favicon-128x128.png',
  './icons/favicon-256x256.png',
  './icons/favicon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(key => ![APP_SHELL_CACHE, DYNAMIC_CACHE].includes(key))
        .map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.endsWith('/content/home.html') || url.pathname.endsWith('/content/about.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) {
            return cached;
          }

          return caches.match('./content/home.html');
        })
    );
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(cached => cached || fetch(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then(response => {
        const copy = response.clone();
        caches.open(APP_SHELL_CACHE).then(cache => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

self.addEventListener('push', event => {
  let data = { title: 'Новое уведомление', body: 'Добавлена новая заметка', reminderId: null };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: './icons/favicon-128x128.png',
      badge: './icons/favicon-64x64.png',
      data: { reminderId: data.reminderId || null },
      actions: data.reminderId ? [
        { action: 'snooze', title: 'Отложить на 5 минут' }
      ] : []
    })
  );
});

self.addEventListener('notificationclick', event => {
  const reminderId = event.notification.data?.reminderId;

  if (event.action === 'snooze' && reminderId) {
    event.waitUntil(
      fetch(`./snooze?reminderId=${encodeURIComponent(reminderId)}`, { method: 'POST' })
        .then(() => event.notification.close())
        .catch(error => console.error('Snooze failed:', error))
    );
    return;
  }

  event.notification.close();
  event.waitUntil(clients.openWindow('./index.html'));
});
