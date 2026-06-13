"use client";

import { motion } from "framer-motion";
import { useThemeStore } from "@/core/theme/theme-store";
import { useTranslation } from "@/core/i18n/useTranslation";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const { t } = useTranslation();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? t("nav.toLight") : t("nav.toDark")}
      className="border-border bg-surface text-foreground hover:bg-surface-2 relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
        animate={{ rotate: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <Icon name={isDark ? "Moon" : "Sun"} size={18} />
      </motion.span>
    </button>
  );
}
