import { createNamespace } from "@/core/storage/storage";

const store = createNamespace("flappy-bird");

export const flappyStorage = {
  loadBest: () => store.load<number>("best", 0),
  saveBest: (best: number) => store.save("best", best),
};
