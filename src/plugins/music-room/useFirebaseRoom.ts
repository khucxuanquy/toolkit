"use client";

import { useCallback, useEffect, useState } from "react";
import { onDisconnect, onValue, push, ref, remove, set, update } from "firebase/database";
import { getRtdb } from "@/core/firebase/app";
import { fetchMediaMeta, type MediaMeta } from "./sources";
import type {
  MusicChatMessage,
  MusicPlayerState,
  MusicQueueItem,
  MusicRoom,
  RoomPresence,
} from "./types";

const MAX_CHAT = 60;

// ── Room helpers ──────────────────────────────────────────────────────────────

export function genRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map((b) => chars[b % chars.length])
    .join("");
}

function rp(code: string) {
  return `musicRooms/${code}`;
}

export async function createRoom(
  name: string,
  visibility: "public" | "private",
  createdBy?: string,
  createdByName?: string,
): Promise<string> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  const code = genRoomCode();
  await set(ref(db, `${rp(code)}/meta`), {
    code,
    name: name.trim() || "Phòng nhạc",
    visibility,
    createdAt: Date.now(),
    lastActive: Date.now(),
    createdBy: createdBy ?? null,
    createdByName: createdByName ?? null,
  });
  await set(ref(db, `${rp(code)}/playerState`), {
    currentItemId: null,
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
  } satisfies MusicPlayerState);
  return code;
}

export async function checkRoomExists(code: string): Promise<boolean> {
  const { get } = await import("firebase/database");
  const db = getRtdb();
  if (!db) return false;
  const snap = await get(ref(db, `${rp(code)}/meta`));
  return snap.exists();
}

/** Rooms with no activity for this long are deleted. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Delete rooms that have been idle longer than {@link ROOM_TTL_MS}. Called from
 * the lobby with the already-loaded room metas so it costs no extra reads.
 * Returns the codes that were removed.
 */
export function pruneStaleRooms(rooms: MusicRoom[]): string[] {
  const db = getRtdb();
  if (!db) return [];
  const now = Date.now();
  const stale = rooms.filter((r) => now - (r.lastActive ?? r.createdAt) > ROOM_TTL_MS);
  for (const r of stale) void remove(ref(db, rp(r.code)));
  return stale.map((r) => r.code);
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseFirebaseRoomReturn {
  room: MusicRoom | null;
  queue: MusicQueueItem[];
  playerState: MusicPlayerState;
  presence: Record<string, RoomPresence>;
  messages: MusicChatMessage[];
  isHost: boolean;
  addSong(url: string): Promise<void>;
  addMeta(meta: MediaMeta): Promise<void>;
  removeSong(id: string): void;
  playSong(id: string): void;
  togglePlay(isPlaying: boolean): void;
  seek(seconds: number): void;
  nextSong(): void;
  prevSong(): void;
  sendChat(text: string): void;
  reportProgress(seconds: number): void;
}

export function useFirebaseRoom(
  roomCode: string,
  userId: string,
  userName: string,
  avatarUrl?: string | null,
): UseFirebaseRoomReturn {
  const [room, setRoom] = useState<MusicRoom | null>(null);
  const [queue, setQueue] = useState<MusicQueueItem[]>([]);
  const [playerState, setPlayerState] = useState<MusicPlayerState>(() => ({
    currentItemId: null,
    isPlaying: false,
    currentTime: 0,
    updatedAt: Date.now(),
  }));
  const [presence, setPresence] = useState<Record<string, RoomPresence>>({});
  const [messages, setMessages] = useState<MusicChatMessage[]>([]);

  const db = getRtdb();
  const base = rp(roomCode);

  // isHost = user with the smallest joinedAt among present users
  const isHost = (() => {
    const entries = Object.entries(presence);
    if (!entries.length) return false;
    const [oldestId] = entries.reduce((a, b) => (a[1].joinedAt < b[1].joinedAt ? a : b));
    return oldestId === userId;
  })();

  // ── Join / leave ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db || !roomCode || !userId) return;
    const presRef = ref(db, `${base}/presence/${userId}`);
    void set(presRef, {
      name: userName,
      avatarUrl: avatarUrl ?? null,
      joinedAt: Date.now(),
    } satisfies RoomPresence);
    void onDisconnect(presRef).remove();

    // Keep the room "alive" so it isn't pruned while someone is here.
    const touch = () => void update(ref(db, `${base}/meta`), { lastActive: Date.now() });
    touch();
    const beat = setInterval(touch, 5 * 60 * 1000);

    return () => {
      clearInterval(beat);
      void remove(presRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, roomCode, userId]);

  // ── Subscriptions ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/meta`), (s) => {
      if (s.exists()) setRoom(s.val() as MusicRoom);
    });
  }, [db, base]);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/presence`), (s) => {
      setPresence((s.val() ?? {}) as Record<string, RoomPresence>);
    });
  }, [db, base]);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/queue`), (s) => {
      const val = (s.val() ?? {}) as Record<string, Partial<MusicQueueItem>>;
      const items: MusicQueueItem[] = Object.entries(val)
        // Backfill source fields for items added before multi-source support.
        .map(([id, v]) => ({
          id,
          source: v.source ?? "youtube",
          sourceId: v.sourceId ?? "",
          url: v.url ?? `https://www.youtube.com/watch?v=${v.sourceId ?? ""}`,
          embedUrl: v.embedUrl ?? "",
          title: v.title ?? "",
          thumbnail: v.thumbnail ?? "",
          channel: v.channel ?? "",
          duration: v.duration ?? null,
          addedBy: v.addedBy ?? "",
          addedByName: v.addedByName ?? "",
          position: v.position ?? 0,
          addedAt: v.addedAt ?? 0,
        }))
        .sort((a, b) => a.position - b.position);
      setQueue(items);
    });
  }, [db, base]);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/playerState`), (s) => {
      if (s.exists()) setPlayerState(s.val() as MusicPlayerState);
    });
  }, [db, base]);

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/chat`), (s) => {
      const val = (s.val() ?? {}) as Record<string, MusicChatMessage>;
      const msgs = Object.values(val)
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(-MAX_CHAT);
      setMessages(msgs);
    });
  }, [db, base]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const pushMeta = useCallback(
    async (meta: MediaMeta) => {
      if (!db) return;
      const nextPos = queue.length > 0 ? Math.max(...queue.map((q) => q.position)) + 1 : 0;
      const itemRef = push(ref(db, `${base}/queue`));
      const item: Omit<MusicQueueItem, "id"> = {
        source: meta.source,
        sourceId: meta.sourceId,
        url: meta.url,
        embedUrl: meta.embedUrl,
        title: meta.title,
        thumbnail: meta.thumbnail,
        channel: meta.channel,
        duration: meta.duration ?? null,
        addedBy: userId,
        addedByName: userName,
        position: nextPos,
        addedAt: Date.now(),
      };
      await set(itemRef, item);
      // Auto-start if nothing is playing
      if (!playerState.currentItemId && itemRef.key) {
        await set(ref(db, `${base}/playerState`), {
          currentItemId: itemRef.key,
          isPlaying: true,
          currentTime: 0,
          updatedAt: Date.now(),
        } satisfies MusicPlayerState);
      }
    },
    [db, base, queue, playerState.currentItemId, userId, userName],
  );

  const addSong = useCallback(
    async (url: string) => {
      const meta = await fetchMediaMeta(url);
      await pushMeta(meta);
    },
    [pushMeta],
  );

  const addMeta = useCallback((meta: MediaMeta) => pushMeta(meta), [pushMeta]);

  const removeSong = useCallback(
    (id: string) => {
      if (!db) return;
      void remove(ref(db, `${base}/queue/${id}`));
      if (playerState.currentItemId === id) {
        const idx = queue.findIndex((q) => q.id === id);
        const next = queue[idx + 1] ?? queue[idx - 1] ?? null;
        void set(ref(db, `${base}/playerState`), {
          currentItemId: next?.id ?? null,
          isPlaying: !!next,
          currentTime: 0,
          updatedAt: Date.now(),
        } satisfies MusicPlayerState);
      }
    },
    [db, base, queue, playerState.currentItemId],
  );

  const playSong = useCallback(
    (id: string) => {
      if (!db) return;
      void set(ref(db, `${base}/playerState`), {
        currentItemId: id,
        isPlaying: true,
        currentTime: 0,
        updatedAt: Date.now(),
      } satisfies MusicPlayerState);
    },
    [db, base],
  );

  const togglePlay = useCallback(
    (isPlaying: boolean) => {
      if (!db || !isHost) return;
      void update(ref(db, `${base}/playerState`), { isPlaying, updatedAt: Date.now() });
    },
    [db, base, isHost],
  );

  const seek = useCallback(
    (seconds: number) => {
      if (!db || !isHost) return;
      void update(ref(db, `${base}/playerState`), {
        currentTime: seconds,
        updatedAt: Date.now(),
      });
    },
    [db, base, isHost],
  );

  const nextSong = useCallback(() => {
    if (!isHost) return;
    const idx = queue.findIndex((q) => q.id === playerState.currentItemId);
    const next = queue[idx + 1];
    if (next) playSong(next.id);
  }, [isHost, queue, playerState.currentItemId, playSong]);

  const prevSong = useCallback(() => {
    if (!isHost) return;
    const idx = queue.findIndex((q) => q.id === playerState.currentItemId);
    const prev = queue[idx - 1];
    if (prev) playSong(prev.id);
  }, [isHost, queue, playerState.currentItemId, playSong]);

  const sendChat = useCallback(
    (text: string) => {
      if (!db || !text.trim()) return;
      const msgRef = push(ref(db, `${base}/chat`));
      void set(msgRef, {
        id: msgRef.key ?? "",
        userId,
        userName,
        text: text.trim(),
        createdAt: Date.now(),
      } satisfies MusicChatMessage);
    },
    [db, base, userId, userName],
  );

  const reportProgress = useCallback(
    (seconds: number) => {
      if (!db || !isHost) return;
      void update(ref(db, `${base}/playerState`), { currentTime: seconds, updatedAt: Date.now() });
    },
    [db, base, isHost],
  );

  return {
    room,
    queue,
    playerState,
    presence,
    messages,
    isHost,
    addSong,
    addMeta,
    removeSong,
    playSong,
    togglePlay,
    seek,
    nextSong,
    prevSong,
    sendChat,
    reportProgress,
  };
}
