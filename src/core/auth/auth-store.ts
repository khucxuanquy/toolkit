"use client";

import { create } from "zustand";
import { localAuth } from "./local-auth";
import { firebaseEnabled } from "@/core/firebase/config";
import type { AuthService, AuthUser, ProfileChanges, SignInInput, SignUpInput } from "./types";

/**
 * Auth store. Uses real Firebase Auth when configured (Google + email/password,
 * with live `onAuthStateChanged` updates and cloud-sync/presence side effects),
 * and falls back to the local in-browser provider otherwise. The UI only ever
 * talks to this store, so the provider can change without touching components.
 */

let servicePromise: Promise<AuthService> | null = null;
function getService(): Promise<AuthService> {
  if (!servicePromise) {
    servicePromise = firebaseEnabled
      ? import("@/core/firebase/firebase-auth").then((m) => m.firebaseAuth)
      : Promise.resolve(localAuth);
  }
  return servicePromise;
}

interface AuthState {
  user: AuthUser | null;
  /** True once the session has been resolved (avoids UI flicker). */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signInEmail: (input: SignInInput) => Promise<AuthUser>;
  signUpEmail: (input: SignUpInput) => Promise<AuthUser>;
  signInGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
  updateProfile: (changes: ProfileChanges) => Promise<AuthUser>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;

    if (firebaseEnabled) {
      const [{ onFirebaseAuth }, effects] = await Promise.all([
        import("@/core/firebase/firebase-auth"),
        import("@/core/firebase/session-effects"),
      ]);
      let prevId: string | null = null;
      onFirebaseAuth((user) => {
        set({ user, hydrated: true });
        if (user && user.id !== prevId) void effects.onSignIn(user);
        else if (!user && prevId) void effects.onSignOut();
        prevId = user?.id ?? null;
      });
      return;
    }

    const user = await localAuth.getSession();
    set({ user, hydrated: true });
  },

  signInEmail: async (input) => {
    const user = await (await getService()).signInEmail(input);
    set({ user });
    return user;
  },

  signUpEmail: async (input) => {
    const user = await (await getService()).signUpEmail(input);
    set({ user });
    return user;
  },

  signInGoogle: async () => {
    const user = await (await getService()).signInGoogle();
    set({ user });
    return user;
  },

  signOut: async () => {
    await (await getService()).signOut();
    set({ user: null });
  },

  updateProfile: async (changes) => {
    const user = await (await getService()).updateProfile(changes);
    set({ user });
    // Reflect the new name/avatar in live presence.
    if (firebaseEnabled) {
      const { startPresence } = await import("@/core/firebase/realtime");
      startPresence(user);
    }
    return user;
  },
}));
