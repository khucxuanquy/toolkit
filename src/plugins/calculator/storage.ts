import { createNamespace } from "@/core/storage/storage";

export interface HistoryItem {
  expr: string;
  result: string;
}

const store = createNamespace("calculator");
const KEY = "history";
const MAX = 15;

export const calculatorStorage = {
  load: () => store.load<HistoryItem[]>(KEY, []),
  save: (items: HistoryItem[]) => store.save(KEY, items.slice(0, MAX)),
};
