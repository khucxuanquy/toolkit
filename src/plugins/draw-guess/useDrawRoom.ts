"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  runTransaction,
  set,
  update,
  get as dbGet,
} from "firebase/database";
import { getRtdb } from "@/core/firebase/app";
import { normalizeGuess } from "./words";
import type { DrawChat, DrawPlayer, DrawState, DrawStroke } from "./types";

const TURN_MS = 75_000;
const REVEAL_MS = 4_000;
const MAX_CHAT = 50;

export function genRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((b) => chars[b % chars.length])
    .join("");
}

const path = (code: string) => `drawRooms/${code}`;

const INITIAL_STATE: DrawState = {
  phase: "lobby",
  drawerId: null,
  round: 0,
  totalTurns: 0,
  word: null,
  wordLen: 0,
  spaces: [],
  turnEndsAt: 0,
  guessedIds: {},
  hostId: null,
};

export async function createDrawRoom(name: string): Promise<string> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  const code = genRoomCode();
  await set(ref(db, `${path(code)}/meta`), { code, name: name.trim() || "Phòng vẽ", createdAt: Date.now() });
  await set(ref(db, `${path(code)}/state`), INITIAL_STATE);
  return code;
}

export async function drawRoomExists(code: string): Promise<boolean> {
  const db = getRtdb();
  if (!db) return false;
  return (await dbGet(ref(db, `${path(code)}/meta`))).exists();
}

export function useDrawRoom(
  code: string,
  userId: string,
  userName: string,
  avatarUrl: string | null | undefined,
) {
  const db = getRtdb();
  const base = path(code);

  const [players, setPlayers] = useState<Record<string, DrawPlayer>>({});
  const [state, setState] = useState<DrawState>(INITIAL_STATE);
  const [strokes, setStrokes] = useState<Record<string, DrawStroke>>({});
  const [chat, setChat] = useState<DrawChat[]>([]);

  // Join / leave.
  useEffect(() => {
    if (!db || !code || !userId) return;
    const meRef = ref(db, `${base}/presence/${userId}`);
    void runTransaction(meRef, (cur: DrawPlayer | null) => ({
      name: userName,
      avatarUrl: avatarUrl ?? null,
      joinedAt: cur?.joinedAt ?? Date.now(),
      score: cur?.score ?? 0,
    }));
    void onDisconnect(meRef).remove();
    return () => {
      void remove(meRef);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, code, userId]);

  // Subscriptions.
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/presence`), (s) =>
      setPlayers((s.val() ?? {}) as Record<string, DrawPlayer>),
    );
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/state`), (s) =>
      setState(s.exists() ? ({ ...INITIAL_STATE, ...s.val() } as DrawState) : INITIAL_STATE),
    );
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/strokes`), (s) =>
      setStrokes((s.val() ?? {}) as Record<string, DrawStroke>),
    );
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/chat`), (s) => {
      const val = (s.val() ?? {}) as Record<string, DrawChat>;
      setChat(Object.values(val).sort((a, b) => a.createdAt - b.createdAt).slice(-MAX_CHAT));
    });
  }, [db, base]);

  const ordered = useMemo(
    () => Object.entries(players).sort((a, b) => a[1].joinedAt - b[1].joinedAt),
    [players],
  );
  const hostId = ordered[0]?.[0] ?? null;
  const isHost = hostId === userId;
  const isDrawer = state.drawerId === userId;

  // ── Actions ────────────────────────────────────────────────────────────────
  const writeState = useCallback(
    (patch: Partial<DrawState>) => {
      if (!db) return;
      void update(ref(db, `${base}/state`), patch);
    },
    [db, base],
  );

  const startGame = useCallback(() => {
    if (!db || ordered.length < 2) return;
    void set(ref(db, `${base}/strokes`), null);
    writeState({
      phase: "choosing",
      drawerId: ordered[0][0],
      round: 1,
      totalTurns: Math.min(ordered.length * 2, 12),
      word: null,
      guessedIds: {},
      hostId,
    });
  }, [db, base, ordered, hostId, writeState]);

  const chooseWord = useCallback(
    (word: string) => {
      if (!db) return;
      const spaces: number[] = [];
      for (let i = 0; i < word.length; i += 1) if (word[i] === " ") spaces.push(i);
      void set(ref(db, `${base}/strokes`), null);
      writeState({
        phase: "drawing",
        word,
        wordLen: word.length,
        spaces,
        turnEndsAt: Date.now() + TURN_MS,
        guessedIds: {},
      });
    },
    [db, base, writeState],
  );

  const sendChat = useCallback(
    (text: string) => {
      if (!db || !text.trim()) return;
      const t = text.trim();
      const correct =
        state.phase === "drawing" &&
        !isDrawer &&
        !state.guessedIds?.[userId] &&
        !!state.word &&
        normalizeGuess(t) === normalizeGuess(state.word);

      if (correct) {
        const remain = Math.max(0, state.turnEndsAt - Date.now());
        const pts = 50 + Math.round((remain / TURN_MS) * 50);
        void runTransaction(ref(db, `${base}/presence/${userId}/score`), (s: number | null) => (s ?? 0) + pts);
        if (state.drawerId) {
          void runTransaction(ref(db, `${base}/presence/${state.drawerId}/score`), (s: number | null) => (s ?? 0) + 25);
        }
        void set(ref(db, `${base}/state/guessedIds/${userId}`), pts);
        const c = push(ref(db, `${base}/chat`));
        void set(c, { id: c.key ?? "", userId, userName, text: `${userName} đoán đúng! (+${pts})`, createdAt: Date.now(), kind: "correct" } satisfies DrawChat);
      } else {
        const c = push(ref(db, `${base}/chat`));
        void set(c, { id: c.key ?? "", userId, userName, text: t, createdAt: Date.now(), kind: "guess" } satisfies DrawChat);
      }
    },
    [db, base, state, isDrawer, userId, userName],
  );

  const beginStroke = useCallback(
    (stroke: DrawStroke): string => {
      if (!db) return "";
      const k = push(ref(db, `${base}/strokes`));
      void set(k, stroke);
      return k.key ?? "";
    },
    [db, base],
  );
  const updateStroke = useCallback(
    (key: string, points: number[]) => {
      if (!db || !key) return;
      void update(ref(db, `${base}/strokes/${key}`), { points });
    },
    [db, base],
  );
  const clearStrokes = useCallback(() => {
    if (!db) return;
    void set(ref(db, `${base}/strokes`), null);
  }, [db, base]);

  // ── Host-driven transitions (timer end, all-guessed, reveal → next) ─────────
  useEffect(() => {
    if (!isHost || !db) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (state.phase === "drawing") {
        const guessers = ordered.filter(([uid]) => uid !== state.drawerId).map(([uid]) => uid);
        const allGuessed = guessers.length > 0 && guessers.every((uid) => state.guessedIds?.[uid]);
        if (now >= state.turnEndsAt || allGuessed) {
          writeState({ phase: "reveal", turnEndsAt: now + REVEAL_MS });
        }
      } else if (state.phase === "reveal" && now >= state.turnEndsAt) {
        if (state.round >= state.totalTurns) {
          writeState({ phase: "ended" });
        } else {
          const idx = ordered.findIndex(([uid]) => uid === state.drawerId);
          const next = ordered[(idx + 1) % ordered.length]?.[0] ?? ordered[0][0];
          writeState({ phase: "choosing", drawerId: next, round: state.round + 1, word: null, guessedIds: {} });
        }
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isHost, db, state, ordered, writeState]);

  const playAgain = useCallback(() => {
    if (!db) return;
    // Reset scores.
    ordered.forEach(([uid]) => void set(ref(db, `${base}/presence/${uid}/score`), 0));
    void set(ref(db, `${base}/chat`), null);
    void set(ref(db, `${base}/strokes`), null);
    void set(ref(db, `${base}/state`), { ...INITIAL_STATE, hostId });
  }, [db, base, ordered, hostId]);

  return {
    players,
    ordered,
    state,
    strokes,
    chat,
    hostId,
    isHost,
    isDrawer,
    startGame,
    chooseWord,
    sendChat,
    beginStroke,
    updateStroke,
    clearStrokes,
    playAgain,
    TURN_MS,
  };
}
