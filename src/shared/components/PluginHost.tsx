"use client";

import { useEffect, useRef } from "react";
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
  const iconRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!plugin) return;
    markUsed(plugin.id);
    // Analytics: which tool was opened (lazy import, no-op without Firebase).
    void import("@/core/firebase/analytics").then((m) => m.track("open_tool", { tool: plugin.id }));
  }, [plugin, markUsed]);

  // Swap the favicon to one drawn from the tool's own icon while it's open.
  // (The tab *title* is set per-route via generateMetadata.) Restored on leave.
  useEffect(() => {
    if (!plugin) return;

    let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    const created = !link;
    const prevHref = link?.getAttribute("href") ?? null;
    const prevType = link?.getAttribute("type") ?? null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }

    const svg = iconRef.current?.querySelector("svg");
    if (svg) {
      const favicon =
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
        `<defs><linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">` +
        `<stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/>` +
        `</linearGradient></defs>` +
        `<rect width="32" height="32" rx="7" fill="url(#fg)"/>` +
        `<g transform="translate(6 6) scale(0.8333)" fill="none" stroke="#ffffff" ` +
        `stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg.innerHTML}</g></svg>`;
      link.type = "image/svg+xml";
      link.href = `data:image/svg+xml,${encodeURIComponent(favicon)}`;
    }

    return () => {
      if (created) {
        link?.remove();
      } else if (link) {
        if (prevHref !== null) link.setAttribute("href", prevHref);
        if (prevType !== null) link.setAttribute("type", prevType);
        else link.removeAttribute("type");
      }
    };
  }, [plugin]);

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
          ref={iconRef}
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
