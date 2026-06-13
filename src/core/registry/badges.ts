/**
 * Optional "data count" badges for plugins.
 *
 * A plugin that stores user data (e.g. to-do tasks, notes) can register a
 * counter here in its `index.ts`. The dashboard shows the number on the
 * plugin's icon in "Recently used" so you can see at a glance how much is
 * inside. Counters are async (they read IndexedDB) and only ever called on the
 * client.
 */
type BadgeCounter = () => Promise<number>;

const counters = new Map<string, BadgeCounter>();

export function registerBadge(pluginId: string, counter: BadgeCounter): void {
  counters.set(pluginId, counter);
}

export function getBadgeCounter(pluginId: string): BadgeCounter | undefined {
  return counters.get(pluginId);
}

/** Resolve every registered counter for the given ids (missing → omitted). */
export async function getBadgeCounts(ids: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(
    ids.map(async (id) => {
      const counter = counters.get(id);
      if (!counter) return null;
      try {
        return [id, await counter()] as const;
      } catch {
        return null;
      }
    }),
  );
  return Object.fromEntries(entries.filter((e): e is readonly [string, number] => e !== null));
}
