"use client";

import { useTranslation } from "@/core/i18n/useTranslation";
import { LOCALES, LOCALE_LABELS, LOCALE_FLAGS } from "@/core/i18n/locale-store";
import { Dropdown } from "./Dropdown";

/**
 * Language picker. Lists every locale in `LOCALES`, so adding a new language is
 * just a matter of extending the locale store + dictionaries — the UI scales
 * automatically.
 */
export function LanguageToggle() {
  const { locale, setLocale, t } = useTranslation();

  return (
    <Dropdown
      align="right"
      trigger={
        <span
          aria-label={t("nav.language")}
          title={t("nav.language")}
          className="border-border bg-surface text-foreground hover:bg-surface-2 flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition-colors"
        >
          <span>{LOCALE_FLAGS[locale]}</span>
          <span className="uppercase">{locale}</span>
        </span>
      }
      items={LOCALES.map((l) => ({
        label: `${LOCALE_FLAGS[l]}  ${LOCALE_LABELS[l]}`,
        onSelect: () => setLocale(l),
      }))}
    />
  );
}
