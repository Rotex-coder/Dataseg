const CACHE_NAME = 'sadewa-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {
        // Safe fallback in dev/sandbox if some resources can't be fetched
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let browser make standard network requests, fall back to cache if offline
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

// Push Notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Sade WhatsApp', body: 'Yeni bir mesajınız var!', icon: 'https://img.icons8.com/color/192/whatsapp--v1.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { ...data, body: event.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || 'https://img.icons8.com/color/192/whatsapp--v1.png',
    badge: 'https://img.icons8.com/color/96/whatsapp--v1.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1',
      senderId: data.senderId
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click to open/focus app and select chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const senderId = event.notification.data?.senderId;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Find if app window is already open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if (senderId) {
            // Send a postMessage to our React app to switch to this chat
            client.postMessage({ type: 'SELECT_CONTACT', contactId: senderId });
          }
          return client.focus();
        }
      }
      // If not open, open a new window with query param
      if (self.clients.openWindow) {
        let url = '/';
        if (senderId) {
          url = `/?selectContact=${senderId}`;
        }
        return self.clients.openWindow(url);
      }
    })
  );
});
