const CACHE_NAME = 'lokal-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/lokal-icon.png',
  '/lokal-logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;
  if (url.includes('/api/') || url.includes('workers.dev') || url.includes('/auth/') || url.includes('/billing/') || url.includes('/households/') || url.includes('/settlements/') || url.includes('/notifications/') || url.includes('/wallet/') || url.includes('/agent/') || url.includes('/admin/')) {
    return;
  }
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('/');
          return new Response('Offline', { status: 503 });
        })
      )
  );
});

// ----- Web Push handlers -----

self.addEventListener('push', (event) => {
  let payload = { title: 'Lokal', body: 'New notification' };
  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const title = payload.title || 'Lokal';
  const options = {
    body: payload.body || '',
    icon: '/lokal-icon.png',
    badge: '/lokal-icon.png',
    tag: payload.category || 'lokal-generic',
    data: payload.data || {},
    requireInteraction: payload.category === 'PAYMENT_CONFIRM_REQUEST',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/';
  if (data.invoice_id) url = `/user/invoices/${data.invoice_id}`;
  else if (data.collection_id) url = `/user/payments/confirm/${data.collection_id}`;
  else if (data.settlement_id) url = `/agent/settlements/${data.settlement_id}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
