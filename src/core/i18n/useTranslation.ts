"use client";

import { useCallback } from "react";
import { useLocaleStore, type Locale } from "./locale-store";
import { dictionaries } from "./translations";

export type TFunction = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

/**
 * Translation hook. Returns the active `locale`, a `setLocale` setter, and a
 * `t(key, vars)` function. Missing keys fall back to the key itself so gaps are
 * visible during development.
 */
export function useTranslation() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const toggleLocale = useLocaleStore((s) => s.toggleLocale);

  const t = useCallback<TFunction>(
    (key, vars) => {
      const dict = dictionaries[locale] ?? dictionaries.en;
      const value = dict[key] ?? dictionaries.en[key] ?? key;
      return interpolate(value, vars);
    },
    [locale],
  );

  return { t, locale, setLocale, toggleLocale };
}

/** Localized plugin name/description, falling back to manifest defaults. */
export function localizePlugin(
  locale: Locale,
  id: string,
  fallback: { name: string; description: string },
): { name: string; description: string } {
  const dict = dictionaries[locale] ?? dictionaries.en;
  return {
    name: dict[`plugins.${id}.name`] ?? fallback.name,
    description: dict[`plugins.${id}.description`] ?? fallback.description,
  };
}
