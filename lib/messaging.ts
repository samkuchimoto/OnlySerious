"use client";

import { getMessaging, getToken } from "firebase/messaging";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, firebaseApp } from "@/lib/firebase";

// getToken() is flagged deprecated in the installed SDK in favor of
// register()/onRegistered(), which sends a Firebase Installation ID
// instead of a registration token — but that pairing's server-side
// story (does the Admin SDK send to an FID the same way it sends to a
// token?) isn't confirmed compatible, where getToken() + the Admin
// SDK's sendEachForMulticast(tokens) is a verified-working pair. Using
// the stable one deliberately rather than the newer, unverified one.
export async function enablePushNotifications(uid: string): Promise<{ enabled: boolean; reason?: string }> {
  if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) {
    return { enabled: false, reason: "Notifications aren't supported in this browser." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { enabled: false, reason: "Notification permission was denied." };
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    return { enabled: false, reason: "Push notifications aren't configured yet." };
  }

  try {
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    const messaging = getMessaging(firebaseApp);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return { enabled: false, reason: "Couldn't get a notification token." };

    await updateDoc(doc(db, "users", uid), { fcmTokens: arrayUnion(token) });
    return { enabled: true };
  } catch (err) {
    console.error("enablePushNotifications failed", err);
    return { enabled: false, reason: "Something went wrong enabling notifications." };
  }
}
