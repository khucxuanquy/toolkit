"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getDatabase, type Database } from "firebase/database";
import { firebaseConfig, firebaseEnabled, realtimeEnabled } from "./config";

/**
 * Lazy, client-only Firebase singletons. Every getter returns null on the
 * server or when Firebase is disabled, so callers must null-check (the app
 * works fully without Firebase).
 */

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;
let rtdbInstance: Database | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getAuthInstance(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!authInstance) authInstance = getAuth(a);
  return authInstance;
}

export function getDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!dbInstance) {
    // Firestore with offline persistence so cached data survives reloads.
    dbInstance = initializeFirestore(a, {
      localCache: persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) }),
    });
  }
  return dbInstance;
}

export function getRtdb(): Database | null {
  const a = getFirebaseApp();
  if (!a || !realtimeEnabled) return null;
  if (!rtdbInstance) rtdbInstance = getDatabase(a);
  return rtdbInstance;
}
