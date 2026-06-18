"use client";

import {
  ref,
  set,
  get as dbGet,
  onValue,
  onDisconnect,
  serverTimestamp,
  query,
  orderByChild,
  limitToLast,
} from "firebase/database";
import { getRtdb } from "./app";
import { useAuthStore } from "@/core/auth/auth-store";
import type { AuthUser } from "@/core/auth/types";

/* ------------------------------ Presence ------------------------------ */
let presenceCleanup: (() => void) | null = null;

export function startPresence(user: AuthUser): void {
  const db = getRtdb();
  if (!db) return;
  stopPresence();
  const meRef = ref(db, `presence/${user.id}`);
  const payload = { name: user.name, avatarUrl: user.avatarUrl ?? null, at: serverTimestamp() };
  const connRef = ref(db, ".info/connected");
  const unsub = onValue(connRef, (snap) => {
    if (snap.val() === true) {
      void onDisconnect(meRef).remove();
      void set(meRef, payload);
    }
  });
  presenceCleanup = () => {
    unsub();
    void set(meRef, null);
  };
}

export function stopPresence(): void {
  if (presenceCleanup) {
    presenceCleanup();
    presenceCleanup = null;
  }
}

export interface OnlineUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export function watchOnline(cb: (users: OnlineUser[]) => void): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  return onValue(ref(db, "presence"), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, { name?: string; avatarUrl?: string | null }>;
    cb(
      Object.entries(val).map(([id, v]) => ({
        id,
        name: v.name ?? "User",
        avatarUrl: v.avatarUrl,
      })),
    );
  });
}

/* ----------------------------- Leaderboard ----------------------------- */
export interface ScoreEntry {
  id: string;
  name: string;
  score: number;
}

/** Store the user's best score for a game (only raises it, never lowers). */
async function submitScore(game: string, user: AuthUser, score: number): Promise<void> {
  const db = getRtdb();
  if (!db) return;
  const entryRef = ref(db, `leaderboard/${game}/${user.id}`);
  const snap = await dbGet(entryRef);
  const prev = (snap.val()?.score as number | undefined) ?? -Infinity;
  if (score > prev) {
    await set(entryRef, { name: user.name, score, at: serverTimestamp() });
  }
}

/** Called by games on game-over — submits the run score if the user is signed in. */
export function reportScore(game: string, score: number): void {
  const user = useAuthStore.getState().user;
  if (user && Number.isFinite(score)) void submitScore(game, user, score);
}

export function watchLeaderboard(
  game: string,
  top: number,
  cb: (entries: ScoreEntry[]) => void,
): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  const q = query(ref(db, `leaderboard/${game}`), orderByChild("score"), limitToLast(top));
  return onValue(q, (snap) => {
    const val = (snap.val() ?? {}) as Record<string, { name?: string; score?: number }>;
    const arr = Object.entries(val).map(([id, v]) => ({
      id,
      name: v.name ?? "User",
      score: v.score ?? 0,
    }));
    arr.sort((a, b) => b.score - a.score);
    cb(arr);
  });
}
