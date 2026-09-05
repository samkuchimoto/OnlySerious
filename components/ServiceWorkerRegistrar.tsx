// /components/ServiceWorkerRegistrar.tsx
// Registers the service worker on every page load.
//
// It used to be registered only inside lib/messaging.ts, at the moment
// someone enabled notifications — so anyone who declined, or never got
// asked, had no service worker at all, and Android therefore never
// offered to install the app. Install and push are separate decisions
// and shouldn't have been coupled.
//
// Registering the same path lib/messaging.ts uses is intentional: only
// one worker can control a scope, and a second one would replace the
// FCM worker and silently kill background push.

"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Fire-and-forget. A failed registration costs installability and
    // offline fallback, not the app — and it fails legitimately in
    // private windows and some in-app browsers.
    navigator.serviceWorker.register("/firebase-messaging-sw.js").catch((err) => {
      console.warn("service worker registration failed:", err);
    });
  }, []);

  return null;
}
