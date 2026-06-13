"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundState {
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  toggle: () => void;
}

/**
 * Global sound on/off preference, persisted to localStorage. The `sound`
 * helper in `shared/lib/sound` reads this synchronously so muting takes effect
 * everywhere immediately.
 */
export const useSoundStore = create<SoundState>()(
  persist(
    (set, get) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set({ enabled: !get().enabled }),
    }),
    { name: "toolkit-sound" },
  ),
);
