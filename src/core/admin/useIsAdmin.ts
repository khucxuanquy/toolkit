"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { getRtdb } from "@/core/firebase/app";
import { useAuthStore } from "@/core/auth/auth-store";
import { realtimeEnabled } from "@/core/firebase/config";
import { reconcileAdmin, SUPER_ADMIN_EMAIL, type AdminRole } from "./admin";

export interface AdminStatus {
  isAdmin: boolean;
  isSuper: boolean;
  role: AdminRole | null;
  /** False until the membership check has resolved (avoids a denied flash). */
  ready: boolean;
}

/**
 * Resolve whether the signed-in user is an admin. Subscribes to their own
 * `admins/{uid}` node and, on sign-in, runs {@link reconcileAdmin} so the super
 * admin self-registers and invited users get promoted.
 */
export function useIsAdmin(): AdminStatus {
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  // Tag the resolved role with the uid it belongs to, so an account switch
  // doesn't briefly expose the previous user's role before the next snapshot.
  const [sub, setSub] = useState<{ uid: string; role: AdminRole | null } | null>(null);

  const useBackend = hydrated && realtimeEnabled && !!user;

  useEffect(() => {
    if (!useBackend || !user) return;
    void reconcileAdmin(user);
    const db = getRtdb();
    if (!db) return;
    return onValue(ref(db, `admins/${user.id}`), (snap) => {
      const val = snap.val() as { role?: AdminRole } | null;
      const isSuperEmail = user.email.trim().toLowerCase() === SUPER_ADMIN_EMAIL;
      setSub({ uid: user.id, role: val?.role ?? (isSuperEmail ? "super" : null) });
    });
  }, [useBackend, user]);

  const fresh = sub && user ? sub.uid === user.id : false;
  const role: AdminRole | null = useBackend && fresh && sub ? sub.role : null;
  const ready = !hydrated ? false : useBackend ? fresh : true;

  return { isAdmin: role !== null, isSuper: role === "super", role, ready };
}
