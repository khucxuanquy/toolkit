import { createNamespace } from "@/core/storage/storage";

/** Best completion time (ms) for single-player games, keyed by grid `${cols}x${rows}`. */
export type BestTimes = Record<string, number>;

const store = createNamespace("memory");
const KEY = "bestTimes";

export const memoryStorage = {
  loadBest: () => store.load<BestTimes>(KEY, {}),
  saveBest: (best: BestTimes) => store.save(KEY, best),
};
