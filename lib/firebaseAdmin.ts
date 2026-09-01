// /lib/firebaseAdmin.ts
// Server-only Firebase Admin — used inside app/api/** routes only, never
// imported into a "use client" file. Lazy-initialized so `next build`
// never requires real credentials just to import this module (same
// reasoning applies as any Next.js app that separates build-time from
// request-time credential checks).

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  return new Proxy({} as T, {
    get(_target, prop, receiver) {
      if (!instance) instance = factory();
      return Reflect.get(instance as object, prop, receiver);
    },
  });
}

export const adminDb: Firestore = lazy(() => getFirestore(getAdminApp()));
export const adminAuth: Auth = lazy(() => getAuth(getAdminApp()));
export const adminStorage: Storage = lazy(() => getStorage(getAdminApp()));

export async function verifyRequestUser(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.slice("Bearer ".length));
    return decoded.uid;
  } catch {
    return null;
  }
}
