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
  self.registration.showNotification(title, { body, icon: "/favicon.ico" });
});
