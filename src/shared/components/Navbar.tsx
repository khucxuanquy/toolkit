"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDashboardUI } from "@/core/services/dashboard-store";
import { useTranslation } from "@/core/i18n/useTranslation";
import { SearchBar, ThemeToggle, LanguageToggle, Icon } from "@/shared/ui";
import { AccountMenu } from "./AccountMenu";
import { cn } from "@/shared/utils/cn";

export function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { query, setQuery, favoritesOnly, setFavoritesOnly } = useDashboardUI();
  const { t } = useTranslation();

  const favoritesButton = isHome && (
    <button
      onClick={() => setFavoritesOnly(!favoritesOnly)}
      aria-pressed={favoritesOnly}
      aria-label={t("nav.favorites")}
      className={cn(
        "border-border bg-surface hover:bg-surface-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
        favoritesOnly && "border-warning/50 text-warning",
      )}
    >
      <Icon name="Star" size={18} className={cn(favoritesOnly && "fill-warning")} />
    </button>
  );

  return (
    <header className="border-border bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto max-w-6xl px-4">
        {/* Top row */}
        <div className="flex h-16 items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="from-primary to-accent flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm">
              <Icon name="Sparkles" size={18} />
            </span>
            <span className="hidden text-lg font-semibold tracking-tight sm:block">
              Quy&apos;s <span className="text-primary">Toolkit</span>
            </span>
          </Link>

          {/* Search — inline & centered on >= sm; on mobile it drops to its own row below. */}
          {isHome && (
            <div className="mx-auto hidden w-full max-w-md sm:block">
              <SearchBar
                value={query}
                onChange={setQuery}
                placeholder={t("nav.searchPlaceholder")}
              />
            </div>
          )}

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className="hidden sm:block">{favoritesButton}</span>
            <LanguageToggle />
            <ThemeToggle />
            <AccountMenu />
          </div>
        </div>

        {/* Search row — mobile only */}
        {isHome && (
          <div className="flex items-center gap-2 pb-3 sm:hidden">
            <SearchBar value={query} onChange={setQuery} placeholder={t("nav.searchPlaceholder")} />
            {favoritesButton}
          </div>
        )}
      </div>
    </header>
  );
}
