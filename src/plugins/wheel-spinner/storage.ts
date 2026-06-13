import { createNamespace } from "@/core/storage/storage";
import { createEntry } from "./logic";
import type { WheelEntry, WheelPreset, WheelSettings } from "./types";

/** Isolated storage for this plugin only. */
const store = createNamespace("wheel-spinner");

const KEYS = {
  entries: "entries",
  presets: "presets",
  settings: "settings",
} as const;

const DEFAULT_ENTRIES: WheelEntry[] = ["Alice", "Bob", "Charlie", "Diana", "Evan", "Farah"].map(
  (name) => createEntry(name),
);

const DEFAULT_SETTINGS: WheelSettings = { removeWinner: false, soundEnabled: true };

export const wheelStorage = {
  loadEntries: () => store.load<WheelEntry[]>(KEYS.entries, DEFAULT_ENTRIES),
  saveEntries: (entries: WheelEntry[]) => store.save(KEYS.entries, entries),

  loadPresets: () => store.load<WheelPreset[]>(KEYS.presets, []),
  savePresets: (presets: WheelPreset[]) => store.save(KEYS.presets, presets),

  loadSettings: () => store.load<WheelSettings>(KEYS.settings, DEFAULT_SETTINGS),
  saveSettings: (settings: WheelSettings) => store.save(KEYS.settings, settings),
};

export { DEFAULT_ENTRIES, DEFAULT_SETTINGS };
