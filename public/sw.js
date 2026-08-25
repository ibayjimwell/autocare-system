self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  const title = data.title || 'AutoCare Notification';
  const options = {
    body: data.body || '',
    icon: '/next.svg',
    badge: '/next.svg',
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
      .then(() => {
        // Send a message to all clients
        const payload = {
          type: 'NEW_NOTIFICATION',
          notification: {
            title,
            body: data.body || '',
            url: data.url || '/',
          }
        };
        self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        }).then(clients => {
          for (const client of clients) {
            client.postMessage(payload);
          }
        });
      })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.openWindow(url)
  );
});