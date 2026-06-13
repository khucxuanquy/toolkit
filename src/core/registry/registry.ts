import type { PlatformPlugin } from "@/shared/types/plugin";

/**
 * In-memory plugin registry. Plugins register themselves at import time; the
 * dashboard reads from here so there are never hardcoded cards.
 */
const registry = new Map<string, PlatformPlugin>();

export function registerPlugin(plugin: PlatformPlugin): void {
  if (registry.has(plugin.id)) {
    // Hot-reload re-runs module side effects; overwrite quietly.
    registry.set(plugin.id, plugin);
    return;
  }
  registry.set(plugin.id, plugin);
}

export function getPlugin(id: string): PlatformPlugin | undefined {
  return registry.get(id);
}

/** All enabled plugins, in stable insertion order. */
export function getAllPlugins(): PlatformPlugin[] {
  return [...registry.values()].filter((p) => p.enabled !== false);
}

export function getPluginsByCategory(): Map<string, PlatformPlugin[]> {
  const grouped = new Map<string, PlatformPlugin[]>();
  for (const plugin of getAllPlugins()) {
    const list = grouped.get(plugin.category) ?? [];
    list.push(plugin);
    grouped.set(plugin.category, list);
  }
  return grouped;
}
