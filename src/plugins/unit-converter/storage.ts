import { createNamespace } from "@/core/storage/storage";
import type { Rates } from "./logic";

const store = createNamespace("unit-converter");
const KEY = "currency-rates";

export interface CachedRates {
  rates: Rates;
  fetchedAt: number;
}

export const unitStorage = {
  loadRates: () => store.load<CachedRates | null>(KEY, null),
  saveRates: (rates: Rates) => store.save(KEY, { rates, fetchedAt: Date.now() }),
};
