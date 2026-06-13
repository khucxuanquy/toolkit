"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Button, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { cn } from "@/shared/utils/cn";
import { memoryStorage, type BestTimes } from "./storage";

const EMOJIS = Array.from("🐶🐱🦊🐼🐵🦁🐯🐸🐙🦄🐝🦋🌸🌼🍎🍓🍕🍩🚀⚽🎲🎸🌈⭐");

type Preset = "easy" | "medium" | "hard" | "custom";
const PRESETS: Record<Exclude<Preset, "custom">, { cols: number; rows: number }> = {
  easy: { cols: 4, rows: 3 },
  medium: { cols: 4, rows: 4 },
  hard: { cols: 6, rows: 4 },
};
const MIN_DIM = 2;
const MAX_DIM = 6;
const MAX_CARDS = 36;

interface Cardo {
  id: number;
  emoji: string;
  matched: boolean;
}

interface State {
  cols: number;
  rows: number;
  cards: Cardo[];
  flipped: number[];
  moves: number;
  locked: boolean;
  started: boolean;
  won: boolean;
  twoPlayer: boolean;
  scores: [number, number];
  current: 0 | 1;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Even number of cards that fits within cols×rows (caps at MAX_CARDS). */
function cardCount(cols: number, rows: number): number {
  const total = Math.min(cols * rows, MAX_CARDS);
  return total - (total % 2);
}

function newCards(cols: number, rows: number): Cardo[] {
  const pairs = cardCount(cols, rows) / 2;
  const picks = shuffle(EMOJIS).slice(0, pairs);
  return shuffle(picks.flatMap((emoji) => [emoji, emoji])).map((emoji, id) => ({
    id,
    emoji,
    matched: false,
  }));
}

interface InitArgs {
  cols: number;
  rows: number;
  twoPlayer: boolean;
}
function init({ cols, rows, twoPlayer }: InitArgs): State {
  return {
    cols,
    rows,
    cards: newCards(cols, rows),
    flipped: [],
    moves: 0,
    locked: false,
    started: false,
    won: false,
    twoPlayer,
    scores: [0, 0],
    current: 0,
  };
}

type Action =
  | { type: "NEW"; cols: number; rows: number; twoPlayer: boolean }
  | { type: "FLIP"; index: number }
  | { type: "RESOLVE" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEW":
      return init({ cols: action.cols, rows: action.rows, twoPlayer: action.twoPlayer });
    case "FLIP": {
      if (state.locked || state.won) return state;
      const card = state.cards[action.index];
      if (card.matched || state.flipped.includes(action.index)) return state;
      const flipped = [...state.flipped, action.index];
      return {
        ...state,
        flipped,
        started: true,
        moves: flipped.length === 2 ? state.moves + 1 : state.moves,
        locked: flipped.length === 2,
      };
    }
    case "RESOLVE": {
      const [a, b] = state.flipped;
      const isMatch = state.cards[a].emoji === state.cards[b].emoji;
      const cards = isMatch
        ? state.cards.map((c, i) => (i === a || i === b ? { ...c, matched: true } : c))
        : state.cards;
      const won = cards.every((c) => c.matched);
      const scores: [number, number] = isMatch
        ? state.current === 0
          ? [state.scores[0] + 1, state.scores[1]]
          : [state.scores[0], state.scores[1] + 1]
        : state.scores;
      // In 2-player mode a miss passes the turn; a match keeps it.
      const current = state.twoPlayer && !isMatch ? (state.current === 0 ? 1 : 0) : state.current;
      return { ...state, cards, flipped: [], locked: false, won, scores, current };
    }
    default:
      return state;
  }
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

const clampDim = (n: number) => Math.max(MIN_DIM, Math.min(MAX_DIM, n));

export default function MemoryPage() {
  const { t } = useTranslation();
  const [preset, setPreset] = useState<Preset>("easy");
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [state, dispatch] = useReducer(reducer, { ...PRESETS.easy, twoPlayer: false }, init);
  const [best, setBest] = useState<BestTimes>({});

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);
  const running = state.started && !state.won;

  const gridKey = `${state.cols}x${state.rows}`;
  const bestMs = best[gridKey] ?? null;

  // Resolve a pair after a short reveal (+ match sound).
  useEffect(() => {
    if (state.flipped.length !== 2) return;
    const [a, b] = state.flipped;
    if (state.cards[a].emoji === state.cards[b].emoji) sound.match();
    const id = setTimeout(() => dispatch({ type: "RESOLVE" }), 720);
    return () => clearTimeout(id);
  }, [state.flipped, state.cards]);

  // Drive the timer while a game is in progress.
  useEffect(() => {
    if (!running) return;
    if (!startRef.current) startRef.current = performance.now() - elapsed;
    const id = setInterval(() => setElapsed(performance.now() - startRef.current), 200);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Load best times once.
  useEffect(() => {
    let active = true;
    void memoryStorage.loadBest().then((b) => {
      if (active) setBest(b);
    });
    return () => {
      active = false;
    };
  }, []);

  // On win: freeze timer, play chime, record best time (single-player only).
  const wonHandled = useRef(false);
  useEffect(() => {
    if (!state.won) {
      wonHandled.current = false;
      return;
    }
    if (wonHandled.current) return;
    wonHandled.current = true;
    const finalMs = startRef.current ? performance.now() - startRef.current : elapsed;
    setElapsed(finalMs);
    sound.win();
    if (!state.twoPlayer) {
      setBest((prev) => {
        const cur = prev[gridKey];
        if (cur != null && cur <= finalMs) return prev;
        const next = { ...prev, [gridKey]: finalMs };
        void memoryStorage.saveBest(next);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.won]);

  const startGame = (p: Preset, two: boolean, dims?: { cols: number; rows: number }) => {
    const base = p === "custom" ? (dims ?? { cols: state.cols, rows: state.rows }) : PRESETS[p];
    startRef.current = 0;
    setElapsed(0);
    dispatch({ type: "NEW", cols: base.cols, rows: base.rows, twoPlayer: two });
  };

  const changePreset = (p: Preset) => {
    setPreset(p);
    startGame(p, twoPlayer);
  };
  const changeDim = (which: "cols" | "rows", delta: number) => {
    const cols = which === "cols" ? clampDim(state.cols + delta) : state.cols;
    const rows = which === "rows" ? clampDim(state.rows + delta) : state.rows;
    setPreset("custom");
    startGame("custom", twoPlayer, { cols, rows });
  };
  const toggleTwoPlayer = () => {
    const next = !twoPlayer;
    setTwoPlayer(next);
    startGame(preset, next);
  };

  const flip = (i: number) => {
    if (state.locked || state.won || state.cards[i].matched || state.flipped.includes(i)) return;
    sound.flip();
    dispatch({ type: "FLIP", index: i });
  };

  const winnerLabel = () => {
    if (state.scores[0] === state.scores[1]) return t("mem.draw");
    return t("mem.win", { n: state.scores[0] > state.scores[1] ? 1 : 2 });
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Mode + grid controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs<Preset>
          items={[
            { value: "easy", label: t("mem.easy") },
            { value: "medium", label: t("mem.medium") },
            { value: "hard", label: t("mem.hard") },
            { value: "custom", label: t("mem.custom") },
          ]}
          value={preset}
          onChange={changePreset}
        />
        <Button variant="outline" size="sm" onClick={() => startGame(preset, twoPlayer)}>
          <Icon name="RotateCcw" size={15} /> {t("mem.new")}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        {preset === "custom" && (
          <>
            <Stepper
              label={t("mem.cols")}
              value={state.cols}
              onDec={() => changeDim("cols", -1)}
              onInc={() => changeDim("cols", 1)}
            />
            <Stepper
              label={t("mem.rows")}
              value={state.rows}
              onDec={() => changeDim("rows", -1)}
              onInc={() => changeDim("rows", 1)}
            />
          </>
        )}
        <button
          onClick={toggleTwoPlayer}
          role="switch"
          aria-checked={twoPlayer}
          className="flex items-center gap-2"
        >
          <span
            className={cn(
              "relative h-5 w-9 rounded-full transition-colors",
              twoPlayer ? "bg-primary" : "bg-border",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                twoPlayer && "translate-x-4",
              )}
            />
          </span>
          {t("mem.twoPlayer")}
        </button>
      </div>

      {/* Scoreboard */}
      {state.twoPlayer ? (
        <div className="grid grid-cols-2 gap-2">
          {([0, 1] as const).map((p) => (
            <div
              key={p}
              className={cn(
                "rounded-xl border px-3 py-2 text-center transition-colors",
                state.current === p && !state.won
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface-2",
              )}
            >
              <div className="text-muted text-xs">{t("mem.player", { n: p + 1 })}</div>
              <div className="text-xl font-bold tabular-nums">{state.scores[p]}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex justify-between text-sm">
          <span className="text-muted">
            {t("mem.time")}:{" "}
            <span className="text-foreground font-bold tabular-nums">{fmtTime(elapsed)}</span>
          </span>
          <span className="text-muted">
            {t("mem.moves")}:{" "}
            <span className="text-foreground font-bold tabular-nums">{state.moves}</span>
          </span>
          <span className="text-muted">
            {t("mem.bestTime")}:{" "}
            <span className="text-foreground font-bold tabular-nums">
              {bestMs != null ? fmtTime(bestMs) : "—"}
            </span>
          </span>
        </div>
      )}

      {/* Board */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
      >
        {state.cards.map((card, i) => {
          const shown = card.matched || state.flipped.includes(i);
          return (
            <button
              key={card.id}
              onClick={() => flip(i)}
              disabled={shown || state.locked}
              className="relative aspect-square"
              aria-label={shown ? card.emoji : t("mem.hidden")}
            >
              <motion.div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-xl border text-2xl sm:text-3xl",
                  shown
                    ? card.matched
                      ? "border-success/50 bg-success/10"
                      : "border-primary/50 bg-surface"
                    : "border-border from-primary/80 to-accent/80 bg-gradient-to-br",
                )}
                animate={{ rotateY: shown ? 180 : 0 }}
                transition={{ duration: 0.25 }}
              >
                <span style={{ transform: "rotateY(180deg)" }}>{shown ? card.emoji : ""}</span>
              </motion.div>
            </button>
          );
        })}
      </div>

      {state.won && (
        <div className="border-success/40 bg-success/10 text-success rounded-xl border p-3 text-center text-sm font-medium">
          {state.twoPlayer
            ? `🏆 ${winnerLabel()} (${state.scores[0]} – ${state.scores[1]})`
            : `🎉 ${t("mem.wonTime", { time: fmtTime(elapsed), moves: state.moves })}`}
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  onDec,
  onInc,
}: {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted">{label}</span>
      <button
        onClick={onDec}
        className="bg-surface-2 hover:bg-border flex h-7 w-7 items-center justify-center rounded-lg"
        aria-label="-"
      >
        <Icon name="Minus" size={14} />
      </button>
      <span className="w-5 text-center font-bold tabular-nums">{value}</span>
      <button
        onClick={onInc}
        className="bg-surface-2 hover:bg-border flex h-7 w-7 items-center justify-center rounded-lg"
        aria-label="+"
      >
        <Icon name="Plus" size={14} />
      </button>
    </div>
  );
}
