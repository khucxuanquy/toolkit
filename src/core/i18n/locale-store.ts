"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "vi" | "en";

export const LOCALES: Locale[] = ["vi", "en"];
export const LOCALE_LABELS: Record<Locale, string> = { vi: "Tiếng Việt", en: "English" };

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = "toolkit-locale";

function applyLang(locale: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

/** App language. Defaults to Vietnamese; persisted to localStorage. */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "vi",
      setLocale: (locale) => {
        applyLang(locale);
        set({ locale });
      },
      toggleLocale: () => get().setLocale(get().locale === "vi" ? "en" : "vi"),
    }),
    {
      name: STORAGE_KEY,
      onRehydrateStorage: () => (state) => {
        if (state) applyLang(state.locale);
      },
    },
  ),
);
