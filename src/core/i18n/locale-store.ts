"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "vi";

/** Ordered list of available languages. Add new languages here + in dictionaries. */
export const LOCALES: Locale[] = ["en", "vi"];
export const LOCALE_LABELS: Record<Locale, string> = { en: "English", vi: "Tiếng Việt" };
export const LOCALE_FLAGS: Record<Locale, string> = { en: "🇬🇧", vi: "🇻🇳" };

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const STORAGE_KEY = "toolkit-locale";

function applyLang(locale: Locale) {
  if (typeof document !== "undefined") document.documentElement.lang = locale;
}

/** App language. Defaults to English; persisted to localStorage. */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "en",
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
