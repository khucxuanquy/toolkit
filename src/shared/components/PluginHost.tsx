"use client";

import { useEffect } from "react";
import Link from "next/link";
// Registering here (a client component) ensures the registry is populated both
// during the static prerender and on the client — including deep links.
import "@/core/registry/register-plugins";
import { getPlugin } from "@/core/registry/registry";
import { usePlatformStore } from "@/core/services/platform-store";
import { useTranslation, localizePlugin } from "@/core/i18n/useTranslation";
import { Icon } from "@/shared/ui";

/** Renders a single plugin by id, with a header and back navigation. */
export function PluginHost({ pluginId }: { pluginId: string }) {
  const plugin = getPlugin(pluginId);
  const markUsed = usePlatformStore((s) => s.markUsed);
  const { t, locale } = useTranslation();

  useEffect(() => {
    if (plugin) markUsed(plugin.id);
  }, [plugin, markUsed]);

  if (!plugin) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <span className="bg-surface-2 text-muted flex h-14 w-14 items-center justify-center rounded-2xl">
          <Icon name="Search" size={26} />
        </span>
        <h1 className="text-xl font-semibold">{t("host.notFoundTitle")}</h1>
        <p className="text-muted text-sm">{t("host.notFoundMsg", { id: pluginId })}</p>
        <Link
          href="/"
          className="text-primary mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <Icon name="Home" size={16} /> {t("host.back")}
        </Link>
      </div>
    );
  }

  const PluginComponent = plugin.component;
  const { name, description } = localizePlugin(locale, plugin.id, plugin);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          aria-label={t("host.back")}
          className="border-border bg-surface text-muted hover:bg-surface-2 hover:text-foreground flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
        >
          <Icon name="Home" size={18} />
        </Link>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white ${plugin.accent ?? "from-primary to-accent"}`}
        >
          <Icon name={plugin.icon} size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{name}</h1>
          <p className="text-muted text-sm">{description}</p>
        </div>
      </div>
      <PluginComponent />
    </div>
  );
}
