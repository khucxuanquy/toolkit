"use client";

import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type CollectionReference,
} from "firebase/firestore";
import { getDb } from "./app";
import { CLOUD_SYNCED_EVENT } from "./events";
import { applyRemoteRecord, getAllRecords, loadData, setKvSyncHook } from "@/core/storage/storage";
import type { KVRecord } from "@/core/storage/db";

/**
 * Offline-first cloud sync. The local Dexie `kv` store stays the source of
 * truth; while signed in we mirror it to `users/{uid}/kv` in Firestore with
 * last-write-wins (by `updatedAt`). Generic over every plugin's data, so
 * to-dos, notes, routes, scores, favourites & recents all sync automatically.
 *
 * Favourites & recents are string-set lists — those are *merged* (union) rather
 * than overwritten, so signing in on a new device combines both sides instead
 * of one clobbering the other.
 */

let snapshotUnsub: (() => void) | null = null;
let currentUid: string | null = null;
// Latest known updatedAt per record id — lets the snapshot ignore our own echoes.
const stamps = new Map<string, number>();

const encodeId = (id: string) => id.replace(/\//g, "__");

/* ---- Set-merge keys (unioned, never overwritten) ---- */
const MERGE_KEYS = new Set(["platform/favorites", "platform/recents"]);
const RECENTS_CAP = 8;
const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));
function unionFor(id: string, a: string[], b: string[]): string[] {
  const merged = [...new Set([...a, ...b])];
  return id === "platform/recents" ? merged.slice(0, RECENTS_CAP) : merged;
}

function notifySynced() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(CLOUD_SYNCED_EVENT));
}

function docData(d: {
  namespace: string;
  key: string;
  value: unknown;
  updatedAt?: number;
}): KVRecord {
  return {
    id: `${d.namespace}/${d.key}`,
    namespace: d.namespace,
    key: d.key,
    value: d.value,
    updatedAt: d.updatedAt ?? 0,
  };
}

function pushRecord(col: CollectionReference, r: KVRecord) {
  stamps.set(r.id, r.updatedAt);
  void setDoc(doc(col, encodeId(r.id)), {
    namespace: r.namespace,
    key: r.key,
    value: r.value,
    updatedAt: r.updatedAt,
  });
}

/** Union a set-merge record from a live remote change into the local store
 *  (and push back if local contributed extras). Idempotent → converges. */
async function reconcileMerge(col: CollectionReference, remote: KVRecord) {
  const localArr = asArray(await loadData(remote.namespace, remote.key, []));
  const remoteArr = asArray(remote.value);
  const merged = unionFor(remote.id, localArr, remoteArr);
  if (!sameSet(merged, localArr)) {
    await applyRemoteRecord({ ...remote, value: merged, updatedAt: Date.now() });
    notifySynced();
  }
  if (!sameSet(merged, remoteArr)) {
    pushRecord(col, { ...remote, value: merged, updatedAt: Date.now() });
  }
}

export async function startCloudSync(uid: string): Promise<void> {
  const db = getDb();
  if (!db || currentUid === uid) return;
  stopCloudSync();
  currentUid = uid;
  const col = collection(db, "users", uid, "kv");

  // 1) One-time merge of local + remote by updatedAt.
  const [snap, local] = await Promise.all([getDocs(col), getAllRecords()]);
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map<string, KVRecord>();
  snap.forEach((d) => {
    const rec = docData(d.data() as never);
    remoteById.set(rec.id, rec);
  });

  const toPush: KVRecord[] = [];
  for (const id of new Set([...localById.keys(), ...remoteById.keys()])) {
    const l = localById.get(id);
    const r = remoteById.get(id);

    // Set-merge lists: union both sides.
    if (MERGE_KEYS.has(id)) {
      const base = (l ?? r) as KVRecord;
      const localArr = asArray(l?.value);
      const remoteArr = asArray(r?.value);
      const merged = unionFor(id, localArr, remoteArr);
      const rec: KVRecord = { ...base, value: merged, updatedAt: Date.now() };
      if (!l || !sameSet(merged, localArr)) await applyRemoteRecord(rec);
      if (!r || !sameSet(merged, remoteArr)) toPush.push(rec);
      else stamps.set(id, r.updatedAt);
      continue;
    }

    if (l && r) {
      if (r.updatedAt > l.updatedAt) {
        await applyRemoteRecord(r);
        stamps.set(id, r.updatedAt);
      } else if (l.updatedAt > r.updatedAt) {
        toPush.push(l);
      } else {
        stamps.set(id, l.updatedAt);
      }
    } else if (l) {
      toPush.push(l);
    } else if (r) {
      await applyRemoteRecord(r);
      stamps.set(id, r.updatedAt);
    }
  }

  if (toPush.length) {
    const batch = writeBatch(db);
    for (const r of toPush) {
      stamps.set(r.id, r.updatedAt);
      batch.set(doc(col, encodeId(r.id)), {
        namespace: r.namespace,
        key: r.key,
        value: r.value,
        updatedAt: r.updatedAt,
      });
    }
    await batch.commit();
  }
  notifySynced();

  // 2) Live remote → local (ignoring our own writes via the stamp map).
  snapshotUnsub = onSnapshot(col, (s) => {
    let changed = false;
    s.docChanges().forEach((ch) => {
      if (ch.type === "removed") return;
      const rec = docData(ch.doc.data() as never);
      if (MERGE_KEYS.has(rec.id)) {
        void reconcileMerge(col, rec);
        return;
      }
      const known = stamps.get(rec.id);
      if (known === undefined || rec.updatedAt > known) {
        stamps.set(rec.id, rec.updatedAt);
        void applyRemoteRecord(rec);
        changed = true;
      }
    });
    if (changed) notifySynced();
  });

  // 3) Local → remote on every save.
  setKvSyncHook((r) => {
    if (currentUid) pushRecord(col, r);
  });
}

export function stopCloudSync(): void {
  setKvSyncHook(null);
  if (snapshotUnsub) {
    snapshotUnsub();
    snapshotUnsub = null;
  }
  currentUid = null;
  stamps.clear();
}
