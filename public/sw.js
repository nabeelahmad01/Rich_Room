// Rich Room Service Worker (Web Push & Chrome Native Notifications)
const CACHE_NAME = 'rich-room-cache-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification listener (Background Web Push via FCM / VAPID)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { title: '🎰 VIP Flash Coin Drop Activated!', body: event.data.text() };
    }
  }

  const title = data.title || '🎰 VIP Flash Coin Drop Activated!';
  const options = {
    body: data.body || data.message || '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [300, 100, 300],
    tag: data.tag || 'pp-alert-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Claim / View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Message listener (Foreground Trigger from Web Page)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, url, tag } = event.data;
    const options = {
      body: body || '5.00 SC + 50,000 GC test bonus has been credited to your player account. Enjoy the games!',
      icon: '/logo.png',
      badge: '/logo.png',
      vibrate: [300, 100, 300],
      tag: tag || 'pp-alert-' + Date.now(),
      renotify: true,
      requireInteraction: true,
      data: {
        url: url || '/',
        dateOfArrival: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Claim / View' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    };

    event.waitUntil(
      self.registration.showNotification(title || '🎰 VIP Flash Coin Drop Activated!', options)
    );
  }
});

// Notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
