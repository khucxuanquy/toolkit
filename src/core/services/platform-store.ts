"use client";

import { create } from "zustand";
import { createNamespace } from "@/core/storage/storage";

const store = createNamespace("platform");
const FAVORITES_KEY = "favorites";
const RECENTS_KEY = "recents";
const MAX_RECENTS = 8;

interface PlatformState {
  favorites: string[];
  recents: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  markUsed: (id: string) => void;
}

/**
 * Platform-wide preferences (favorites + recently used) persisted to IndexedDB.
 * Hydrated once on the client; every mutation writes through asynchronously.
 */
export const usePlatformStore = create<PlatformState>((set, get) => ({
  favorites: [],
  recents: [],
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    const [favorites, recents] = await Promise.all([
      store.load<string[]>(FAVORITES_KEY, []),
      store.load<string[]>(RECENTS_KEY, []),
    ]);
    set({ favorites, recents, hydrated: true });
  },

  toggleFavorite: (id) => {
    const favorites = get().favorites.includes(id)
      ? get().favorites.filter((f) => f !== id)
      : [...get().favorites, id];
    set({ favorites });
    void store.save(FAVORITES_KEY, favorites);
  },

  isFavorite: (id) => get().favorites.includes(id),

  markUsed: (id) => {
    const recents = [id, ...get().recents.filter((r) => r !== id)].slice(0, MAX_RECENTS);
    set({ recents });
    void store.save(RECENTS_KEY, recents);
  },
}));
