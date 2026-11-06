// Service worker for Riley. It only shows the reminders sent by scripts/reminders (issue #4); it caches nothing,
// so it can't serve stale pages. (Offline caching is a separate piece of work: issue #10.)
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let p = {}; try { p = event.data ? event.data.json() : {}; } catch {}
  const d = p.data || p.notification || p;                  // FCM wraps our data message as { data: { … } }
  event.waitUntil(self.registration.showNotification(d.title || "Riley", {
    body: d.body || "", tag: d.tag || "riley", icon: "icon-192.png", badge: "icon-192.png", data: { url: d.url || "./" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "./", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    const w = wins.find((c) => c.url.startsWith(self.registration.scope));
    return w ? w.focus() : self.clients.openWindow(url);
  }));
});
