import type { WheelEntry, WheelExport } from "./types";

/** Vibrant, evenly-spaced slice palette (works in light & dark). */
export const WHEEL_COLORS = [
  "#6366f1",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#06b6d4",
] as const;

export const colorForIndex = (i: number): string => WHEEL_COLORS[i % WHEEL_COLORS.length];

let idCounter = 0;
/** Reasonably unique id for an entry/preset. */
export function makeId(prefix = "e"): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
}

export function createEntry(label: string, weight = 1): WheelEntry {
  return { id: makeId(), label: label.trim(), weight: Math.max(1, Math.round(weight)) };
}

export const totalWeight = (entries: WheelEntry[]): number =>
  entries.reduce((sum, e) => sum + Math.max(1, e.weight), 0);

/**
 * Pick a winning entry index using weighted random selection.
 * `rand` in [0, 1) is injectable for testing; defaults to Math.random.
 */
export function weightedPick(entries: WheelEntry[], rand: number = Math.random()): number {
  const total = totalWeight(entries);
  let target = rand * total;
  for (let i = 0; i < entries.length; i += 1) {
    target -= Math.max(1, entries[i].weight);
    if (target < 0) return i;
  }
  return entries.length - 1;
}

/** Cumulative slice angles (radians), starting at 0 = pointing right (+x). */
export function sliceAngles(entries: WheelEntry[]): { start: number; end: number; mid: number }[] {
  const total = totalWeight(entries);
  let cursor = 0;
  return entries.map((e) => {
    const span = (Math.max(1, e.weight) / total) * Math.PI * 2;
    const start = cursor;
    const end = cursor + span;
    cursor = end;
    return { start, end, mid: (start + end) / 2 };
  });
}

const TWO_PI = Math.PI * 2;
/** Pointer sits at the top of the wheel (screen angle 3π/2 with y-down canvas). */
const POINTER_ANGLE = (3 * Math.PI) / 2;

/**
 * Compute the absolute target rotation so that `winnerIndex`'s slice lands
 * under the pointer, after `spins` full turns. `jitter` in [0,1) nudges within
 * the slice so the pointer doesn't always hit dead-center.
 */
export function targetRotationFor(
  entries: WheelEntry[],
  winnerIndex: number,
  currentRotation: number,
  spins: number,
  jitter: number,
): number {
  const slices = sliceAngles(entries);
  const slice = slices[winnerIndex];
  const span = slice.end - slice.start;
  // Aim within the middle 80% of the slice.
  const aim = slice.start + span * (0.1 + 0.8 * jitter);
  const desiredMod = (((POINTER_ANGLE - aim) % TWO_PI) + TWO_PI) % TWO_PI;
  const currentMod = ((currentRotation % TWO_PI) + TWO_PI) % TWO_PI;
  const delta = (desiredMod - currentMod + TWO_PI) % TWO_PI;
  return currentRotation + spins * TWO_PI + delta;
}

/** Validate + normalise an imported wheel file. Returns null if invalid. */
export function parseWheelImport(raw: string): WheelExport | null {
  try {
    const data = JSON.parse(raw) as Partial<WheelExport>;
    if (data?.type !== "offlinekit-wheel" || !Array.isArray(data.entries)) return null;
    const entries = data.entries
      .filter((e): e is WheelEntry => typeof e?.label === "string")
      .map((e) => createEntry(e.label, typeof e.weight === "number" ? e.weight : 1));
    if (entries.length === 0) return null;
    return {
      type: "offlinekit-wheel",
      version: 1,
      name: typeof data.name === "string" ? data.name : "Imported wheel",
      entries,
    };
  } catch {
    return null;
  }
}

export function toWheelExport(name: string, entries: WheelEntry[]): WheelExport {
  return { type: "offlinekit-wheel", version: 1, name, entries };
}
