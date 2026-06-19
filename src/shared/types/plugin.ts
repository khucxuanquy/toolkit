import type { ComponentType } from "react";

/** High-level grouping shown on the dashboard. */
export type PluginCategory = "Games" | "Utilities" | "Productivity" | "Generators" | "Entertainment";

/**
 * The contract every tool/game must satisfy to live on the platform.
 *
 * Metadata (id/name/description/...) is lightweight and always loaded so the
 * dashboard can render cards without pulling in plugin code. The `component`
 * is produced by `next/dynamic`, so the actual implementation is only fetched
 * when the user opens the plugin — keeping the initial bundle small.
 */
export interface PlatformPlugin {
  /** Stable unique id, also used as the storage namespace. e.g. "tic-tac-toe". */
  id: string;
  /** Display name. */
  name: string;
  /** One-line description for the card. */
  description: string;
  /** Dashboard category. */
  category: PluginCategory;
  /** lucide-react icon name (see shared/ui/Icon). e.g. "Grid3x3". */
  icon: string;
  /** App route, conventionally `/p/{id}`. */
  route: string;
  /** Optional search tags. */
  tags?: string[];
  /** When false the plugin is hidden/disabled. Defaults to true. */
  enabled?: boolean;
  /** Accent gradient (tailwind classes) used on the card. */
  accent?: string;
  /** Lazily-loaded plugin UI. */
  component: ComponentType;
}

/**
 * Plugin metadata without the component — what a plugin's `manifest.ts`
 * exports. The plugin's `index.ts` combines this with a dynamic component.
 */
export type PluginManifest = Omit<PlatformPlugin, "component">;
