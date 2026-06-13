import { createNamespace } from "@/core/storage/storage";

const store = createNamespace("game-2048");

export const game2048Storage = {
  loadBest: () => store.load<number>("best", 0),
  saveBest: (best: number) => store.save("best", best),
};
