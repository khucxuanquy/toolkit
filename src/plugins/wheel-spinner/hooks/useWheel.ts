"use client";

import { useEffect, useReducer } from "react";
import { wheelStorage, DEFAULT_ENTRIES, DEFAULT_SETTINGS } from "../storage";
import { createEntry, makeId, parseWheelImport, toWheelExport } from "../logic";
import type { WheelEntry, WheelPreset, WheelSettings } from "../types";

interface State {
  entries: WheelEntry[];
  presets: WheelPreset[];
  settings: WheelSettings;
  activeName: string;
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; entries: WheelEntry[]; presets: WheelPreset[]; settings: WheelSettings }
  | { type: "ADD"; label: string }
  | { type: "ADD_MANY"; labels: string[] }
  | { type: "EDIT"; id: string; label?: string; weight?: number }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR" }
  | { type: "SHUFFLE" }
  | { type: "SET_ENTRIES"; entries: WheelEntry[]; name?: string }
  | { type: "SET_SETTINGS"; settings: Partial<WheelSettings> }
  | { type: "SAVE_PRESET"; name: string }
  | { type: "DELETE_PRESET"; id: string }
  | { type: "SET_NAME"; name: string };

const initialState: State = {
  entries: DEFAULT_ENTRIES,
  presets: [],
  settings: DEFAULT_SETTINGS,
  // Empty until the user names/loads a wheel; the UI shows a localized default.
  activeName: "",
  hydrated: false,
};

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        entries: action.entries,
        presets: action.presets,
        settings: action.settings,
        hydrated: true,
      };
    case "ADD": {
      const label = action.label.trim();
      if (!label) return state;
      return { ...state, entries: [...state.entries, createEntry(label)] };
    }
    case "ADD_MANY": {
      const added = action.labels
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => createEntry(l));
      return added.length ? { ...state, entries: [...state.entries, ...added] } : state;
    }
    case "EDIT":
      return {
        ...state,
        entries: state.entries.map((e) =>
          e.id === action.id
            ? {
                ...e,
                label: action.label !== undefined ? action.label : e.label,
                weight:
                  action.weight !== undefined ? Math.max(1, Math.round(action.weight)) : e.weight,
              }
            : e,
        ),
      };
    case "REMOVE":
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case "CLEAR":
      return { ...state, entries: [] };
    case "SHUFFLE":
      return { ...state, entries: shuffle(state.entries) };
    case "SET_ENTRIES":
      return {
        ...state,
        entries: action.entries,
        activeName: action.name ?? state.activeName,
      };
    case "SET_SETTINGS":
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case "SAVE_PRESET": {
      const preset: WheelPreset = {
        id: makeId("p"),
        name: action.name.trim() || "Untitled wheel",
        entries: state.entries,
        savedAt: Date.now(),
      };
      return { ...state, presets: [preset, ...state.presets], activeName: preset.name };
    }
    case "DELETE_PRESET":
      return { ...state, presets: state.presets.filter((p) => p.id !== action.id) };
    case "SET_NAME":
      return { ...state, activeName: action.name };
    default:
      return state;
  }
}

export function useWheel() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { entries, presets, settings, activeName, hydrated } = state;

  // Hydrate from IndexedDB once.
  useEffect(() => {
    let active = true;
    void (async () => {
      const [e, p, s] = await Promise.all([
        wheelStorage.loadEntries(),
        wheelStorage.loadPresets(),
        wheelStorage.loadSettings(),
      ]);
      if (active) dispatch({ type: "HYDRATE", entries: e, presets: p, settings: s });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Write-through persistence after hydration.
  useEffect(() => {
    if (hydrated) void wheelStorage.saveEntries(entries);
  }, [entries, hydrated]);
  useEffect(() => {
    if (hydrated) void wheelStorage.savePresets(presets);
  }, [presets, hydrated]);
  useEffect(() => {
    if (hydrated) void wheelStorage.saveSettings(settings);
  }, [settings, hydrated]);

  return {
    entries,
    presets,
    settings,
    activeName,
    hydrated,
    canSpin: entries.length >= 2,
    // entry actions
    addEntry: (label: string) => dispatch({ type: "ADD", label }),
    addMany: (labels: string[]) => dispatch({ type: "ADD_MANY", labels }),
    editEntry: (id: string, change: { label?: string; weight?: number }) =>
      dispatch({ type: "EDIT", id, ...change }),
    removeEntry: (id: string) => dispatch({ type: "REMOVE", id }),
    clearEntries: () => dispatch({ type: "CLEAR" }),
    shuffleEntries: () => dispatch({ type: "SHUFFLE" }),
    // settings
    setSettings: (change: Partial<WheelSettings>) =>
      dispatch({ type: "SET_SETTINGS", settings: change }),
    // presets
    savePreset: (name: string) => dispatch({ type: "SAVE_PRESET", name }),
    loadPreset: (preset: WheelPreset) =>
      dispatch({
        type: "SET_ENTRIES",
        entries: preset.entries.map((e) => createEntry(e.label, e.weight)),
        name: preset.name,
      }),
    deletePreset: (id: string) => dispatch({ type: "DELETE_PRESET", id }),
    setName: (name: string) => dispatch({ type: "SET_NAME", name }),
    // import / export
    exportData: () => JSON.stringify(toWheelExport(activeName, entries), null, 2),
    importData: (raw: string): boolean => {
      const parsed = parseWheelImport(raw);
      if (!parsed) return false;
      dispatch({ type: "SET_ENTRIES", entries: parsed.entries, name: parsed.name });
      return true;
    },
  };
}
