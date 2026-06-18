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
import { applyRemoteRecord, getAllRecords, setKvSyncHook } from "@/core/storage/storage";
import type { KVRecord } from "@/core/storage/db";

/**
 * Offline-first cloud sync. The local Dexie `kv` store stays the source of
 * truth; while signed in we mirror it to `users/{uid}/kv` in Firestore with
 * last-write-wins (by `updatedAt`). Generic over every plugin's data, so
 * to-dos, notes, routes, scores, favourites & recents all sync automatically.
 */

let snapshotUnsub: (() => void) | null = null;
let currentUid: string | null = null;
// Latest known updatedAt per record id — lets the snapshot ignore our own echoes.
const stamps = new Map<string, number>();

const encodeId = (id: string) => id.replace(/\//g, "__");

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
