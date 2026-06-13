import { createNamespace } from "@/core/storage/storage";
import { DEFAULT_LIFETIME_S } from "./logic";
import type { Scores, TicTacToeSettings } from "./types";

/** Isolated storage for this plugin only. */
const store = createNamespace("tic-tac-toe");

const KEYS = {
  scores: "scores",
  settings: "settings",
} as const;

const DEFAULT_SCORES: Scores = { X: 0, O: 0 };
const DEFAULT_SETTINGS: TicTacToeSettings = { lifetimeMs: DEFAULT_LIFETIME_S * 1000 };

export const ticTacToeStorage = {
  loadScores: async (): Promise<Scores> => {
    const s = await store.load<Partial<Scores>>(KEYS.scores, DEFAULT_SCORES);
    return {
      X: typeof s?.X === "number" ? s.X : 0,
      O: typeof s?.O === "number" ? s.O : 0,
    };
  },
  saveScores: (scores: Scores) => store.save(KEYS.scores, scores),

  // Normalise: tolerate records saved by older versions of this plugin that
  // had a different settings shape (so `lifetimeMs` is never NaN/undefined).
  loadSettings: async (): Promise<TicTacToeSettings> => {
    const s = await store.load<Partial<TicTacToeSettings>>(KEYS.settings, DEFAULT_SETTINGS);
    const ms =
      typeof s?.lifetimeMs === "number" && s.lifetimeMs > 0
        ? s.lifetimeMs
        : DEFAULT_SETTINGS.lifetimeMs;
    return { lifetimeMs: ms };
  },
  saveSettings: (settings: TicTacToeSettings) => store.save(KEYS.settings, settings),
};

export { DEFAULT_SCORES, DEFAULT_SETTINGS };
