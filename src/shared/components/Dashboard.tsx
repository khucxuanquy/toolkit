"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllPlugins, getPlugin } from "@/core/registry/registry";
import { getBadgeCounts } from "@/core/registry/badges";
import { useDashboardUI } from "@/core/services/dashboard-store";
import { usePlatformStore } from "@/core/services/platform-store";
import { useTranslation, localizePlugin } from "@/core/i18n/useTranslation";
import type { Locale } from "@/core/i18n/locale-store";
import { useMounted } from "@/shared/hooks/useMounted";
import type { PlatformPlugin } from "@/shared/types/plugin";
import { Icon } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";
import { PluginCard } from "./PluginCard";

const CATEGORY_ORDER = ["Games", "Entertainment", "Utilities", "Productivity", "Generators"];

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

/** Horizontal row of category chips for filtering the grid. */
function CategoryFilter({
  categories,
  active,
  onSelect,
}: {
  categories: string[];
  active: string | null;
  onSelect: (category: string | null) => void;
}) {
  const { t } = useTranslation();
  const chip = (key: string | null, label: string) => {
    const selected = active === key;
    return (
      <button
        key={key ?? "__all"}
        onClick={() => onSelect(key)}
        className={cn(
          "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
          selected
            ? "bg-primary text-white shadow-sm"
            : "bg-surface-2 text-muted hover:text-foreground",
        )}
      >
        {label}
      </button>
    );
  };
  return (
    <div className="-mx-1 flex [scrollbar-width:thin] gap-2 overflow-x-auto px-1 pb-1">
      {chip(null, t("dashboard.allCategories"))}
      {categories.map((c) => chip(c, t(`category.${c}`)))}
    </div>
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
function RecentIcon({ plugin, badge }: { plugin: PlatformPlugin; badge?: number }) {
  const { locale } = useTranslation();
  const { name } = localizePlugin(locale, plugin.id, plugin);
  return (
    <Link
      href={plugin.route}
      title={name}
      aria-label={badge ? `${name} (${badge})` : name}
      className="group relative shrink-0 transition-transform hover:-translate-y-0.5"
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm",
          plugin.accent ?? "from-primary to-accent",
        )}
      >
        <Icon name={plugin.icon} size={24} />
      </span>
      {badge ? (
        <span className="bg-danger ring-background absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-bold text-white ring-2">
          {badge > 99 ? "99+" : badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Logo-only, single-row strip that scrolls horizontally when it overflows. */
function RecentRow({ title, plugins }: { title: string; plugins: PlatformPlugin[] }) {
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Resolve data-count badges (todo tasks, notes, …) once the row is shown.
  useEffect(() => {
    let active = true;
    void getBadgeCounts(plugins.map((p) => p.id)).then((c) => {
      if (active) setCounts(c);
    });
    return () => {
      active = false;
    };
  }, [plugins]);

  if (plugins.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-muted text-sm font-semibold tracking-wide uppercase">{title}</h2>
      {/* pt-2 leaves room for the hover lift + badge so neither gets clipped by overflow. */}
      <div className="-mx-1 flex [scrollbar-width:thin] gap-3 overflow-x-auto px-1 pt-2 pb-1">
        {plugins.map((p) => (
          <RecentIcon key={p.id} plugin={p} badge={counts[p.id]} />
        ))}
      </div>
    </section>
  );
}

export function Dashboard() {
  const mounted = useMounted();
  const { query, favoritesOnly, category, setCategory } = useDashboardUI();
  const { t, locale } = useTranslation();
  const favorites = usePlatformStore((s) => s.favorites);
  const recents = usePlatformStore((s) => s.recents);

  const allPlugins = useMemo(() => getAllPlugins(), []);

  // All categories present, ordered — used to render the filter chips.
  const allCategories = useMemo(() => {
    const present = new Set<string>(allPlugins.map((p) => p.category));
    return [
      ...CATEGORY_ORDER.filter((c) => present.has(c)),
      ...[...present].filter((c) => !CATEGORY_ORDER.includes(c)),
    ];
  }, [allPlugins]);

  const filtered = useMemo(
    () =>
      allPlugins.filter(
        (p) => matches(p, query, locale) && (!category || p.category === category),
      ),
    [allPlugins, query, locale, category],
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

  return (
    <div className="space-y-8">
      <CategoryFilter categories={allCategories} active={category} onSelect={setCategory} />

      {filtered.length === 0 ? (
        <EmptyState
          icon="Search"
          title={t("dashboard.nothingFoundTitle")}
          message={t("dashboard.nothingFoundMsg", { query })}
        />
      ) : (
        <div className="space-y-10">
          {!query && !category && mounted && recentPlugins.length > 0 && (
            <RecentRow title={t("dashboard.recentlyUsed")} plugins={recentPlugins} />
          )}
          {orderedCategories.map((cat) => (
            <Section
              key={cat}
              title={t(`category.${cat}`)}
              plugins={byCategory.get(cat) ?? []}
            />
          ))}
        </div>
      )}
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
