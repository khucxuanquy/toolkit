"use client";

import { useTranslation } from "@/core/i18n/useTranslation";
import { Icon } from "./Icon";

/** Toggles the UI language between Vietnamese and English. */
export function LanguageToggle() {
  const { locale, toggleLocale, t } = useTranslation();

  return (
    <button
      onClick={toggleLocale}
      aria-label={t("nav.language")}
      title={t("nav.language")}
      className="border-border bg-surface text-foreground hover:bg-surface-2 flex h-10 items-center gap-1.5 rounded-xl border px-2.5 text-sm font-semibold transition-colors"
    >
      <Icon name="Languages" size={18} />
      <span className="uppercase">{locale}</span>
    </button>
  );
}
