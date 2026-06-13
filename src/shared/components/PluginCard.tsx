"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { PlatformPlugin } from "@/shared/types/plugin";
import { usePlatformStore } from "@/core/services/platform-store";
import { useTranslation, localizePlugin } from "@/core/i18n/useTranslation";
import { Icon } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";

export function PluginCard({ plugin }: { plugin: PlatformPlugin }) {
  const isFavorite = usePlatformStore((s) => s.favorites.includes(plugin.id));
  const toggleFavorite = usePlatformStore((s) => s.toggleFavorite);
  const { t, locale } = useTranslation();
  const { name, description } = localizePlugin(locale, plugin.id, plugin);

  return (
    <motion.div layout whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
      <Link
        href={plugin.route}
        className="group rounded-card border-border bg-surface hover:border-primary/50 relative flex h-full flex-col gap-3 border p-4 shadow-sm transition-colors"
      >
        <div className="flex items-start justify-between">
          <span
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white",
              plugin.accent ?? "from-primary to-accent",
            )}
          >
            <Icon name={plugin.icon} size={22} />
          </span>
          <button
            onClick={(e) => {
              e.preventDefault();
              toggleFavorite(plugin.id);
            }}
            aria-label={isFavorite ? t("card.removeFav") : t("card.addFav")}
            className="text-muted hover:bg-surface-2 hover:text-warning rounded-lg p-1.5 transition-colors"
          >
            <Icon name="Star" size={18} className={cn(isFavorite && "fill-warning text-warning")} />
          </button>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold">{name}</h3>
          <p className="text-muted mt-1 line-clamp-2 text-sm">{description}</p>
        </div>

        <span className="bg-surface-2 text-muted inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium">
          {t(`category.${plugin.category}`)}
        </span>
      </Link>
    </motion.div>
  );
}
