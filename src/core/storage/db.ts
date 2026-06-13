import Dexie, { type Table } from "dexie";

/**
 * A single namespaced key/value record. The compound `id` (`${namespace}/${key}`)
 * is the primary key, guaranteeing one plugin can never overwrite another's data.
 */
export interface KVRecord {
  /** `${namespace}/${key}` — primary key. */
  id: string;
  namespace: string;
  key: string;
  value: unknown;
  updatedAt: number;
}

/** IndexedDB database for the whole platform. */
export class ToolkitDB extends Dexie {
  kv!: Table<KVRecord, string>;

  constructor() {
    super("offline-toolkit");
    this.version(1).stores({
      // `id` primary key, `namespace` indexed for namespace-wide queries.
      kv: "id, namespace",
    });
  }
}

/**
 * Lazily-created singleton. Dexie touches `indexedDB`, which only exists in the
 * browser, so we never instantiate it during SSR.
 */
let _db: ToolkitDB | null = null;

export function getDB(): ToolkitDB {
  if (typeof window === "undefined") {
    throw new Error("ToolkitDB is only available in the browser.");
  }
  if (!_db) _db = new ToolkitDB();
  return _db;
}

export const compositeId = (namespace: string, key: string): string => `${namespace}/${key}`;
