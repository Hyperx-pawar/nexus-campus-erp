// d:/tenant/public/sw.js
// Service Worker for receiving background Web Push notifications.

self.addEventListener('push', function (event) {
  if (!event.data) {
    console.log('Push event received with no data.');
    return;
  }

  let data = {};
  try {
    data = event.data.json();
  } catch (err) {
    data = { title: 'New Notification', body: event.data.text() };
  }

  const title = data.title || '🚨 ERP Alert';
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/icon.png',
    data: {
      url: data.url || '/dashboard',
    },
    actions: data.actions || [],
    vibrate: [200, 100, 200],
    tag: data.tag || 'erp-alert',
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // If a window is already open, focus it and navigate
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
