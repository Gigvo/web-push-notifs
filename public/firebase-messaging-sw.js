self.addEventListener("install", (event) => {
  console.log("[SW] Service worker installing...");
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Service worker activating...");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification click received.");
  event.notification.close();

  // Open your app when notification is clicked
  const url = "/";
  const urlToOpen = new URL(url, self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.navigate(urlToOpen).then(() => client.focus());
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
      .catch((error) => {
        console.error("[SW] Error handling notification click:", error);
      })
  );
});

self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event);

  if (event.data) {
    try {
      const data = event.data.json();
      console.log("[SW] Push data:", data);

      const notificationOptions = {
        body: data.notification?.body || data.body || "New notification",
        icon: data.notification?.icon || "/logo.svg",
        badge: "/logo.svg",
        data: data.data || {},
      };

      event.waitUntil(
        self.registration.showNotification(
          data.notification?.title || data.title || "New Message",
          notificationOptions
        )
      );
    } catch (error) {
      console.error("[SW] Error parsing push data:", error);
    }
  }
});

console.log("[SW] Service worker script loaded successfully!");
