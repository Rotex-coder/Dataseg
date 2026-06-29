const CACHE_NAME = 'sadewa-cache-v5';
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

// Function to dynamically turn a square icon/avatar into a perfect circle for notifications
async function makeCircleIcon(imageUrl) {
  if (!imageUrl) return '/icon.png';
  
  if (
    typeof OffscreenCanvas === 'undefined' || 
    typeof createImageBitmap === 'undefined' || 
    typeof FileReader === 'undefined'
  ) {
    return imageUrl;
  }
  
  try {
    // If it's a Dicebear SVG, convert to PNG so it can be drawn on canvas
    if (imageUrl.includes('/initials/svg?seed=')) {
      imageUrl = imageUrl.replace('/initials/svg?seed=', '/initials/png?seed=');
    }

    let blob;
    if (imageUrl.startsWith('data:')) {
      const parts = imageUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      blob = new Blob([u8arr], { type: mime });
    } else {
      const response = await fetch(imageUrl);
      if (!response.ok) return imageUrl;
      blob = await response.blob();
    }
    
    const imageBitmap = await createImageBitmap(blob);
    
    const size = Math.min(imageBitmap.width, imageBitmap.height);
    // Limit canvas size for memory and performance
    const targetSize = Math.min(size, 192);
    
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return imageUrl;
    
    // Clear rect to be transparent
    ctx.clearRect(0, 0, targetSize, targetSize);
    
    // Draw circular clipping path
    ctx.beginPath();
    ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    
    // Draw centered square crop of original image
    const sx = (imageBitmap.width - size) / 2;
    const sy = (imageBitmap.height - size) / 2;
    ctx.drawImage(imageBitmap, sx, sy, size, size, 0, 0, targetSize, targetSize);
    
    const outputBlob = await canvas.convertToBlob({ type: 'image/png' });
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = () => resolve(imageUrl);
      reader.readAsDataURL(outputBlob);
    });
  } catch (err) {
    console.warn("Failed to create circular notification icon:", err);
    return imageUrl;
  }
}

// Push Notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'Sade WhatsApp', body: 'Yeni bir mesajınız var!', icon: '/icon.png' };
  
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { ...data, body: event.data.text() };
    }
  }

  const showNotificationPromise = (async () => {
    let iconUrl = data.icon || '/icon.png';
    try {
      iconUrl = await makeCircleIcon(iconUrl);
    } catch (err) {
      console.error("Failed to process circular icon:", err);
    }

    const options = {
      body: data.body,
      icon: iconUrl,
      badge: '/badge.svg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: '1',
        senderId: data.senderId
      }
    };

    return self.registration.showNotification(data.title, options);
  })();

  event.waitUntil(showNotificationPromise);
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
