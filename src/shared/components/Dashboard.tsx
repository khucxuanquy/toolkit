"use client";

import { useMemo } from "react";
import Link from "next/link";
import { getAllPlugins, getPlugin } from "@/core/registry/registry";
import { useDashboardUI } from "@/core/services/dashboard-store";
import { usePlatformStore } from "@/core/services/platform-store";
import { useTranslation, localizePlugin } from "@/core/i18n/useTranslation";
import type { Locale } from "@/core/i18n/locale-store";
import { useMounted } from "@/shared/hooks/useMounted";
import type { PlatformPlugin } from "@/shared/types/plugin";
import { Icon } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";
import { PluginCard } from "./PluginCard";

const CATEGORY_ORDER = ["Games", "Utilities", "Productivity", "Generators"];

/** Matches against both default and localized name/description so search works
 *  regardless of the active language. */
function matches(plugin: PlatformPlugin, query: string, locale: Locale): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const localized = localizePlugin(locale, plugin.id, plugin);
  return (
    plugin.name.toLowerCase().includes(q) ||
    localized.name.toLowerCase().includes(q) ||
    plugin.description.toLowerCase().includes(q) ||
    localized.description.toLowerCase().includes(q) ||
    plugin.category.toLowerCase().includes(q) ||
    (plugin.tags ?? []).some((tag) => tag.toLowerCase().includes(q))
  );
}

function Grid({ plugins }: { plugins: PlatformPlugin[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plugins.map((p) => (
        <PluginCard key={p.id} plugin={p} />
      ))}
    </div>
  );
}

function Section({ title, plugins }: { title: string; plugins: PlatformPlugin[] }) {
  if (plugins.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">{title}</h2>
      <Grid plugins={plugins} />
    </section>
  );
}

/** A single logo-only tile used in the horizontal "recently used" strip. */
function RecentIcon({ plugin }: { plugin: PlatformPlugin }) {
  const { locale } = useTranslation();
  const { name } = localizePlugin(locale, plugin.id, plugin);
  return (
    <Link
      href={plugin.route}
      title={name}
      aria-label={name}
      className="shrink-0 transition-transform hover:-translate-y-0.5"
    >
      <span
        className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
          plugin.accent ?? "from-primary to-accent",
        )}
      >
        <Icon name={plugin.icon} size={24} />
      </span>
    </Link>
  );
}

/** Logo-only, single-row strip that scrolls horizontally when it overflows. */
function RecentRow({ title, plugins }: { title: string; plugins: PlatformPlugin[] }) {
  if (plugins.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">{title}</h2>
      <div className="-mx-1 flex [scrollbar-width:thin] gap-3 overflow-x-auto px-1 pb-1">
        {plugins.map((p) => (
          <RecentIcon key={p.id} plugin={p} />
        ))}
      </div>
    </section>
  );
}

export function Dashboard() {
  const mounted = useMounted();
  const { query, favoritesOnly } = useDashboardUI();
  const { t, locale } = useTranslation();
  const favorites = usePlatformStore((s) => s.favorites);
  const recents = usePlatformStore((s) => s.recents);

  const allPlugins = useMemo(() => getAllPlugins(), []);
  const filtered = useMemo(
    () => allPlugins.filter((p) => matches(p, query, locale)),
    [allPlugins, query, locale],
  );

  const recentPlugins = useMemo(
    () => recents.map((id) => getPlugin(id)).filter((p): p is PlatformPlugin => Boolean(p)),
    [recents],
  );

  const byCategory = useMemo(() => {
    const map = new Map<string, PlatformPlugin[]>();
    for (const p of filtered) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [filtered]);

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...[...byCategory.keys()].filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  // Avoid hydration mismatch: favorites/recents come from IndexedDB.
  const favoriteList = mounted ? filtered.filter((p) => favorites.includes(p.id)) : [];

  if (favoritesOnly) {
    return (
      <div className="space-y-8">
        {favoriteList.length > 0 ? (
          <Section title={t("dashboard.favorites")} plugins={favoriteList} />
        ) : (
          <EmptyState
            icon="Star"
            title={t("dashboard.noFavoritesTitle")}
            message={t("dashboard.noFavoritesMsg")}
          />
        )}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        icon="Search"
        title={t("dashboard.nothingFoundTitle")}
        message={t("dashboard.nothingFoundMsg", { query })}
      />
    );
  }

  return (
    <div className="space-y-10">
      {!query && mounted && recentPlugins.length > 0 && (
        <RecentRow title={t("dashboard.recentlyUsed")} plugins={recentPlugins} />
      )}
      {orderedCategories.map((category) => (
        <Section
          key={category}
          title={t(`category.${category}`)}
          plugins={byCategory.get(category) ?? []}
        />
      ))}
    </div>
  );
}

function EmptyState({ icon, title, message }: { icon: string; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
      <span className="bg-surface-2 text-muted flex h-14 w-14 items-center justify-center rounded-2xl">
        <Icon name={icon} size={26} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted max-w-xs text-sm">{message}</p>
    </div>
  );
}
