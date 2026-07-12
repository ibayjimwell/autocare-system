// public/sw.js
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'AutoCare Notification';
  const options = {
    body: data.body || '',
    // icon: '/icon-192x192.pn',
    // badge: '/badge-72x72.png',
    icon: '/next.svg',
    badge: '/next.svg',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});