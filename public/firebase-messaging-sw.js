// Firebase Cloud Messaging service worker — handles push notifications
// received while the app isn't in the foreground. Must live at this
// exact path (/firebase-messaging-sw.js) for the default registration
// lookup in lib/messaging.ts to find it.
//
// Config values below are the same NEXT_PUBLIC_ ones used everywhere
// else in the app — not secrets (they're already in the client bundle),
// just hardcoded here because a service worker can't read Next.js env
// vars at runtime the normal way.
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.18.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDAHQzR7-dZspInXydzaqb-Ios9utz_96A",
  authDomain: "onlyserious-1db69.firebaseapp.com",
  projectId: "onlyserious-1db69",
  storageBucket: "onlyserious-1db69.firebasestorage.app",
  messagingSenderId: "10192386717",
  appId: "1:10192386717:web:1061320eb667828069b274",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "New notification";
  const body = payload.notification?.body ?? "";
  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });
});

// Tapping a notification should open the app, not just dismiss it —
// without this the push is a dead end, which is most of the retention
// value gone.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Reuse an already-open tab rather than stacking new ones.
      for (const client of clients) {
        if ("focus" in client) return client.focus();
      }
      return self.clients.openWindow("/browse");
    }),
  );
});

// ---------------------------------------------------------------------
// PWA shell. Lives in this file rather than a second service worker
// because only one worker can control a given scope — registering a
// separate /sw.js at "/" would silently replace this one and take push
// notifications down with it.
//
// Deliberately minimal: only the offline fallback and the icons are
// cached. Nothing else is. Profiles, matches and messages are live data
// on a dating app, and a cache-first worker that served yesterday's
// browse results — or one person's photos to the next viewer — would be
// worse than being offline.
// ---------------------------------------------------------------------

const SHELL_CACHE = "osthai-shell-v1";
const SHELL_ASSETS = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Only page navigations are handled. Everything else — API routes,
  // Firestore, auth, images — goes straight to the network untouched.
  if (request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(() => caches.match("/offline.html").then((r) => r ?? Response.error())),
  );
});
