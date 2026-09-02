// /lib/firebase.ts
// Client-side Firebase (Auth + Firestore reads) — a real, separate
// Firebase project from any other app, own credentials, own data.
"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, type Auth, type User } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// The Firebase client SDK only ever runs in the browser (every real call
// site here is inside a useEffect or an event handler), but Next.js still
// executes this module during server-side prerendering/SSR. Guard against
// initializing there — `window` doesn't exist yet, and there's no real
// config to initialize with anyway during a build.
function initFirebase(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return { app, auth: getAuth(app), db: getFirestore(app) };
}

const clientSdk = typeof window !== "undefined" ? initFirebase() : undefined;

export const firebaseApp = clientSdk?.app as FirebaseApp;
export const auth = clientSdk?.auth as Auth;
export const db = clientSdk?.db as Firestore;

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser() {
  await signOut(auth);
}

export function watchAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
