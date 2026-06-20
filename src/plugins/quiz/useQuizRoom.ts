"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  get as dbGet,
} from "firebase/database";
import { getRtdb } from "@/core/firebase/app";
import type { QuizAnswer, QuizPlayer, QuizQuestion, QuizState } from "./types";

const QUESTION_MS = 20_000;
const REVEAL_MS = 4_500;

export function genRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((b) => chars[b % chars.length])
    .join("");
}

const path = (code: string) => `quizRooms/${code}`;

const INITIAL_STATE: QuizState = {
  phase: "lobby",
  qIndex: 0,
  questionEndsAt: 0,
  total: 0,
  hostId: null,
};

export async function createQuizRoom(name: string): Promise<string> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  const code = genRoomCode();
  await set(ref(db, `${path(code)}/meta`), { code, name: name.trim() || "Quiz", createdAt: Date.now() });
  await set(ref(db, `${path(code)}/state`), INITIAL_STATE);
  return code;
}

export async function quizRoomExists(code: string): Promise<boolean> {
  const db = getRtdb();
  if (!db) return false;
  return (await dbGet(ref(db, `${path(code)}/meta`))).exists();
}

export function useQuizRoom(
  code: string,
  userId: string,
  userName: string,
  avatarUrl: string | null | undefined,
) {
  const db = getRtdb();
  const base = path(code);

  const [players, setPlayers] = useState<Record<string, QuizPlayer>>({});
  const [state, setState] = useState<QuizState>(INITIAL_STATE);
  const [questions, setQuestionsState] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Record<string, QuizAnswer>>>({});

  useEffect(() => {
    if (!db || !code || !userId) return;
    const meRef = ref(db, `${base}/presence/${userId}`);
    void runTransaction(meRef, (cur: QuizPlayer | null) => ({
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

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/presence`), (s) => setPlayers((s.val() ?? {}) as Record<string, QuizPlayer>));
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/state`), (s) =>
      setState(s.exists() ? ({ ...INITIAL_STATE, ...s.val() } as QuizState) : INITIAL_STATE),
    );
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/questions`), (s) => setQuestionsState((s.val() ?? []) as QuizQuestion[]));
  }, [db, base]);
  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, `${base}/answers`), (s) =>
      setAnswers((s.val() ?? {}) as Record<string, Record<string, QuizAnswer>>),
    );
  }, [db, base]);

  const ordered = useMemo(
    () => Object.entries(players).sort((a, b) => a[1].joinedAt - b[1].joinedAt),
    [players],
  );
  const hostId = ordered[0]?.[0] ?? null;
  const isHost = hostId === userId;

  const writeState = useCallback(
    (patch: Partial<QuizState>) => {
      if (db) void update(ref(db, `${base}/state`), patch);
    },
    [db, base],
  );

  const setQuestions = useCallback(
    (qs: QuizQuestion[]) => {
      if (db) void set(ref(db, `${base}/questions`), qs);
    },
    [db, base],
  );

  const startGame = useCallback(() => {
    if (!db || questions.length === 0) return;
    void set(ref(db, `${base}/answers`), null);
    ordered.forEach(([uid]) => void set(ref(db, `${base}/presence/${uid}/score`), 0));
    writeState({ phase: "question", qIndex: 0, questionEndsAt: Date.now() + QUESTION_MS, total: questions.length, hostId });
  }, [db, base, questions.length, ordered, hostId, writeState]);

  const answer = useCallback(
    (choice: number) => {
      if (!db || state.phase !== "question") return;
      const aRef = ref(db, `${base}/answers/${state.qIndex}/${userId}`);
      // First answer only — don't allow changing.
      void runTransaction(aRef, (cur: QuizAnswer | null) => (cur ? cur : { choice, at: Date.now() }));
    },
    [db, base, state.phase, state.qIndex, userId],
  );

  const myAnswer = answers[state.qIndex]?.[userId] ?? null;

  // Host: scoring + phase transitions.
  const scoreQuestion = useCallback(
    (qIndex: number) => {
      if (!db) return;
      const q = questions[qIndex];
      if (!q) return;
      const ans = answers[qIndex] ?? {};
      for (const [uid, a] of Object.entries(ans)) {
        if (a.choice === q.correct) {
          const frac = Math.max(0, Math.min(1, (state.questionEndsAt - a.at) / QUESTION_MS));
          const pts = 500 + Math.round(500 * frac);
          void runTransaction(ref(db, `${base}/presence/${uid}/score`), (s: number | null) => (s ?? 0) + pts);
        }
      }
      void update(ref(db, `${base}/state`), { phase: "reveal", questionEndsAt: Date.now() + REVEAL_MS });
    },
    [db, base, questions, answers, state.questionEndsAt],
  );

  useEffect(() => {
    if (!isHost || !db) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (state.phase === "question") {
        const answered = Object.keys(answers[state.qIndex] ?? {}).length;
        if (now >= state.questionEndsAt || answered >= ordered.length) scoreQuestion(state.qIndex);
      } else if (state.phase === "reveal" && now >= state.questionEndsAt) {
        if (state.qIndex + 1 >= state.total) writeState({ phase: "ended" });
        else writeState({ phase: "question", qIndex: state.qIndex + 1, questionEndsAt: now + QUESTION_MS });
      }
    }, 800);
    return () => clearInterval(id);
  }, [isHost, db, state, answers, ordered.length, scoreQuestion, writeState]);

  const playAgain = useCallback(() => {
    if (!db) return;
    void set(ref(db, `${base}/answers`), null);
    ordered.forEach(([uid]) => void set(ref(db, `${base}/presence/${uid}/score`), 0));
    writeState({ phase: "lobby", qIndex: 0, total: 0 });
  }, [db, base, ordered, writeState]);

  return {
    players,
    ordered,
    state,
    questions,
    answers,
    myAnswer,
    hostId,
    isHost,
    setQuestions,
    startGame,
    answer,
    playAgain,
    QUESTION_MS,
  };
}
