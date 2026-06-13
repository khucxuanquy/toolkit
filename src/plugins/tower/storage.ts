import { createNamespace } from "@/core/storage/storage";

export type Difficulty = "easy" | "medium" | "hard";
export type BestScores = Record<Difficulty, number>;

const DEFAULT_BEST: BestScores = { easy: 0, medium: 0, hard: 0 };

const store = createNamespace("tower");

export const towerStorage = {
  loadBest: () => store.load<BestScores>("best", DEFAULT_BEST),
  saveBest: (best: BestScores) => store.save("best", best),
};
