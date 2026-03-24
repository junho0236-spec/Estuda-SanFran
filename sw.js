self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : { title: 'Nova Mensagem', body: 'Você recebeu uma nova mensagem no Connect.' };
  const options = {
    body: data.body,
    icon: 'https://ais-dev-p2c7bucgrxblynilly5nor-126434917976.us-east1.run.app/icon.png',
    badge: 'https://ais-dev-p2c7bucgrxblynilly5nor-126434917976.us-east1.run.app/icon.png',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
