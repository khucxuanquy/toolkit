import { compositeId, getDB, type KVRecord } from "./db";

/**
 * Reusable IndexedDB-backed persistence layer.
 *
 * All values are stored under a `namespace` so plugins are isolated. Prefer the
 * `createNamespace(...)` helper inside a plugin instead of calling these with a
 * raw namespace string.
 */

/** Optional hook called after every local write — used by Firebase cloud sync. */
type KvHook = (record: KVRecord) => void;
let syncHook: KvHook | null = null;
export function setKvSyncHook(hook: KvHook | null): void {
  syncHook = hook;
}

export async function saveData<T>(namespace: string, key: string, value: T): Promise<void> {
  const record: KVRecord = {
    id: compositeId(namespace, key),
    namespace,
    key,
    value,
    updatedAt: Date.now(),
  };
  await getDB().kv.put(record);
  syncHook?.(record);
}

/** Every stored record — used by cloud sync to push the full local dataset. */
export async function getAllRecords(): Promise<KVRecord[]> {
  return getDB().kv.toArray();
}

/** Write a record straight to IndexedDB without firing the sync hook (used when
 *  applying a change pulled from the cloud, so it isn't pushed back). */
export async function applyRemoteRecord(record: KVRecord): Promise<void> {
  await getDB().kv.put(record);
}

export async function loadData<T>(namespace: string, key: string, fallback: T): Promise<T>;
export async function loadData<T>(namespace: string, key: string): Promise<T | undefined>;
export async function loadData<T>(
  namespace: string,
  key: string,
  fallback?: T,
): Promise<T | undefined> {
  const record = await getDB().kv.get(compositeId(namespace, key));
  if (!record) return fallback;
  return record.value as T;
}

export async function removeData(namespace: string, key: string): Promise<void> {
  await getDB().kv.delete(compositeId(namespace, key));
}

/** List every key stored within a namespace. */
export async function listKeys(namespace: string): Promise<string[]> {
  const records = await getDB().kv.where("namespace").equals(namespace).toArray();
  return records.map((r) => r.key);
}

/** Wipe an entire namespace (e.g. a plugin "reset all data" action). */
export async function clearNamespace(namespace: string): Promise<void> {
  await getDB().kv.where("namespace").equals(namespace).delete();
}

/**
 * A namespace-bound storage handle. Each plugin should create exactly one of
 * these (typically in its `storage.ts`) so it can never touch another plugin's
 * data by accident.
 */
export interface NamespaceStorage {
  readonly namespace: string;
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string, fallback: T): Promise<T>;
  load<T>(key: string): Promise<T | undefined>;
  remove(key: string): Promise<void>;
  keys(): Promise<string[]>;
  clear(): Promise<void>;
}

export function createNamespace(namespace: string): NamespaceStorage {
  return {
    namespace,
    save: (key, value) => saveData(namespace, key, value),
    load: ((key: string, fallback?: unknown) =>
      loadData(namespace, key, fallback as never)) as NamespaceStorage["load"],
    remove: (key) => removeData(namespace, key),
    keys: () => listKeys(namespace),
    clear: () => clearNamespace(namespace),
  };
}
