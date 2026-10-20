/* Browser notifications are delivered per staff account. The staffId and
 * notification id come from the server; the Web page checks the active session
 * before refreshing the private inbox. Never cache notification content here. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'AutoCare Notification';
  const url = typeof data.url === 'string' && data.url.startsWith('/') && !data.url.startsWith('//')
    ? data.url : '/';
  const staffId = typeof data.staffId === 'string' ? data.staffId : null;
  const id = typeof data.id === 'string' ? data.id : null;
  event.waitUntil((async () => {
    await self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: id || undefined,
      data: { url, staffId, id },
    });
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const windowClient of windows) {
      windowClient.postMessage({ type: 'NEW_NOTIFICATION', notification: { id, staffId } });
    }
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const windowClient of windows) {
      if (windowClient.url.startsWith(self.location.origin)) {
        await windowClient.focus();
        if ('navigate' in windowClient) await windowClient.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});
