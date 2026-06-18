"use client";

import type { AuthUser } from "@/core/auth/types";

/**
 * Side effects tied to the auth session. Loaded lazily by the auth store so the
 * heavy Firestore/RTDB/Analytics code only enters the bundle once a user is
 * actually signing in.
 */

export async function onSignIn(user: AuthUser): Promise<void> {
  const [{ startCloudSync }, { startPresence }, { setAnalyticsUser }] = await Promise.all([
    import("./cloud-sync"),
    import("./realtime"),
    import("./analytics"),
  ]);
  startPresence(user);
  setAnalyticsUser(user.id);
  await startCloudSync(user.id);
}

export async function onSignOut(): Promise<void> {
  const [{ stopCloudSync }, { stopPresence }, { setAnalyticsUser }] = await Promise.all([
    import("./cloud-sync"),
    import("./realtime"),
    import("./analytics"),
  ]);
  stopCloudSync();
  stopPresence();
  setAnalyticsUser(null);
}
