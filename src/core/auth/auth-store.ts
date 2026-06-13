"use client";

import { create } from "zustand";
import { localAuth } from "./local-auth";
import type { AuthUser, SignInInput, SignUpInput } from "./types";

/**
 * Active auth provider. Swap `localAuth` here for a real {@link AuthService}
 * (Firebase/Supabase) and nothing else in the app needs to change.
 */
const service = localAuth;

interface AuthState {
  user: AuthUser | null;
  /** True once the session has been read from storage (avoids UI flicker). */
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signInEmail: (input: SignInInput) => Promise<AuthUser>;
  signUpEmail: (input: SignUpInput) => Promise<AuthUser>;
  signInGoogle: () => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const user = await service.getSession();
    set({ user, hydrated: true });
  },

  signInEmail: async (input) => {
    const user = await service.signInEmail(input);
    set({ user });
    return user;
  },

  signUpEmail: async (input) => {
    const user = await service.signUpEmail(input);
    set({ user });
    return user;
  },

  signInGoogle: async () => {
    const user = await service.signInGoogle();
    set({ user });
    return user;
  },

  signOut: async () => {
    await service.signOut();
    set({ user: null });
  },
}));
