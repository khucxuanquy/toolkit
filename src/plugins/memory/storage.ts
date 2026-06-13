import { createNamespace } from "@/core/storage/storage";

export type Difficulty = "easy" | "hard";

const store = createNamespace("memory");

export const memoryStorage = {
  loadBest: (d: Difficulty) => store.load<number | null>(`best-${d}`, null),
  saveBest: (d: Difficulty, moves: number) => store.save(`best-${d}`, moves),
};
