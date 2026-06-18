"use client";

import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User as FbUser,
} from "firebase/auth";
import { getAuthInstance } from "./app";
import type { AuthService, AuthProviderId, AuthUser } from "@/core/auth/types";

function mapProvider(u: FbUser): AuthProviderId {
  return u.providerData[0]?.providerId === "google.com" ? "google" : "password";
}

function mapUser(u: FbUser): AuthUser {
  const email = u.email ?? "";
  return {
    id: u.uid,
    email,
    name: u.displayName ?? email.split("@")[0] ?? "User",
    provider: mapProvider(u),
    avatarUrl: u.photoURL ?? undefined,
  };
}

/** Map a Firebase auth error code → one of our i18n error keys. */
function mapError(err: unknown): Error {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "auth/email-already-in-use") return new Error("auth.err.emailInUse");
  if (code === "auth/weak-password") return new Error("auth.err.passwordMin");
  if (
    code === "auth/invalid-credential" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-email"
  ) {
    return new Error("auth.err.invalidCredentials");
  }
  if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
    return new Error("auth.err.popupClosed");
  }
  return new Error("auth.err.generic");
}

function requireAuth() {
  const auth = getAuthInstance();
  if (!auth) throw new Error("auth.err.generic");
  return auth;
}

export const firebaseAuth: AuthService = {
  getSession() {
    const auth = getAuthInstance();
    if (!auth) return Promise.resolve(null);
    // Resolve once with the initial auth state.
    return new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (u) => {
        unsub();
        resolve(u ? mapUser(u) : null);
      });
    });
  },

  async signUpEmail({ name, email, password }) {
    const auth = requireAuth();
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const displayName = name.trim() || email.trim().split("@")[0];
      await updateProfile(cred.user, { displayName });
      return { ...mapUser(cred.user), name: displayName };
    } catch (e) {
      throw mapError(e);
    }
  },

  async signInEmail({ email, password }) {
    const auth = requireAuth();
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      return mapUser(cred.user);
    } catch (e) {
      throw mapError(e);
    }
  },

  async signInGoogle() {
    const auth = requireAuth();
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      return mapUser(cred.user);
    } catch (e) {
      throw mapError(e);
    }
  },

  async signOut() {
    const auth = getAuthInstance();
    if (auth) await fbSignOut(auth);
  },
};

/** Subscribe to live auth changes (sign-in via popup, token refresh, sign-out). */
export function onFirebaseAuth(cb: (user: AuthUser | null) => void): () => void {
  const auth = getAuthInstance();
  if (!auth) return () => {};
  return onAuthStateChanged(auth, (u) => cb(u ? mapUser(u) : null));
}
