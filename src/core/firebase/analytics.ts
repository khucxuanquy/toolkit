"use client";

import { getAnalytics, isSupported, logEvent, setUserId, type Analytics } from "firebase/analytics";
import { getFirebaseApp } from "./app";
import { firebaseConfig } from "./config";

let analytics: Analytics | null = null;
let initStarted = false;

/** Initialise Analytics once (no-op without a measurementId or on the server). */
export function initAnalytics(): void {
  if (initStarted || typeof window === "undefined") return;
  if (!firebaseConfig.measurementId) return;
  initStarted = true;
  void isSupported().then((ok) => {
    const app = getFirebaseApp();
    if (ok && app) analytics = getAnalytics(app);
  });
}

/** Log a custom event (silently ignored when analytics is unavailable). */
export function track(event: string, params?: Record<string, unknown>): void {
  if (!analytics) return;
  try {
    logEvent(analytics, event, params);
  } catch {
    /* ignore */
  }
}

export function setAnalyticsUser(uid: string | null): void {
  if (!analytics) return;
  try {
    setUserId(analytics, uid ?? "");
  } catch {
    /* ignore */
  }
}
