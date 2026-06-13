"use client";

import { useEffect, useReducer } from "react";
import { motion } from "framer-motion";
import { Button, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { memoryStorage, type Difficulty } from "./storage";

const EMOJIS = Array.from("🐶🐱🦊🐼🐵🦁🐯🐸🐙🦄🐝🦋🌸🌼🍎🍓");
const PAIRS: Record<Difficulty, number> = { easy: 6, hard: 8 };

interface Cardo {
  id: number;
  emoji: string;
  matched: boolean;
}
type Best = Record<Difficulty, number | null>;
interface State {
  difficulty: Difficulty;
  cards: Cardo[];
  flipped: number[];
  moves: number;
  locked: boolean;
  won: boolean;
  best: Best;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function newCards(difficulty: Difficulty): Cardo[] {
  const picks = shuffle(EMOJIS).slice(0, PAIRS[difficulty]);
  return shuffle(picks.flatMap((emoji) => [emoji, emoji])).map((emoji, id) => ({
    id,
    emoji,
    matched: false,
  }));
}

function init(difficulty: Difficulty, best: Best = { easy: null, hard: null }): State {
  return {
    difficulty,
    cards: newCards(difficulty),
    flipped: [],
    moves: 0,
    locked: false,
    won: false,
    best,
  };
}

type Action =
  | { type: "NEW"; difficulty: Difficulty }
  | { type: "FLIP"; index: number }
  | { type: "RESOLVE" }
  | { type: "HYDRATE"; best: Best };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEW":
      return init(action.difficulty, state.best);
    case "HYDRATE":
      return { ...state, best: action.best };
    case "FLIP": {
      if (state.locked || state.won) return state;
      const card = state.cards[action.index];
      if (card.matched || state.flipped.includes(action.index)) return state;
      const flipped = [...state.flipped, action.index];
      return {
        ...state,
        flipped,
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
      let best = state.best;
      if (won) {
        const cur = state.best[state.difficulty];
        if (cur === null || state.moves < cur) {
          best = { ...state.best, [state.difficulty]: state.moves };
        }
      }
      return { ...state, cards, flipped: [], locked: false, won, best };
    }
    default:
      return state;
  }
}

export default function MemoryPage() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, "easy" as Difficulty, init);

  // Resolve a pair after a short reveal.
  useEffect(() => {
    if (state.flipped.length === 2) {
      const id = setTimeout(() => dispatch({ type: "RESOLVE" }), 700);
      return () => clearTimeout(id);
    }
  }, [state.flipped]);

  // Load best scores (dispatch in async callback).
  useEffect(() => {
    let active = true;
    void Promise.all([memoryStorage.loadBest("easy"), memoryStorage.loadBest("hard")]).then(
      ([easy, hard]) => {
        if (active) dispatch({ type: "HYDRATE", best: { easy, hard } });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  // Persist best (storage write).
  useEffect(() => {
    if (state.best.easy !== null) void memoryStorage.saveBest("easy", state.best.easy);
    if (state.best.hard !== null) void memoryStorage.saveBest("hard", state.best.hard);
  }, [state.best]);

  const best = state.best[state.difficulty];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Tabs<Difficulty>
          items={[
            { value: "easy", label: t("mem.easy") },
            { value: "hard", label: t("mem.hard") },
          ]}
          value={state.difficulty}
          onChange={(d) => dispatch({ type: "NEW", difficulty: d })}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => dispatch({ type: "NEW", difficulty: state.difficulty })}
        >
          <Icon name="RotateCcw" size={15} /> {t("mem.new")}
        </Button>
      </div>

      <div className="flex justify-between text-sm">
        <span className="text-muted">
          {t("mem.moves")}:{" "}
          <span className="text-foreground font-bold tabular-nums">{state.moves}</span>
        </span>
        <span className="text-muted">
          {t("mem.best")}:{" "}
          <span className="text-foreground font-bold tabular-nums">{best ?? "—"}</span>
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {state.cards.map((card, i) => {
          const shown = card.matched || state.flipped.includes(i);
          return (
            <button
              key={card.id}
              onClick={() => dispatch({ type: "FLIP", index: i })}
              disabled={shown || state.locked}
              className="relative aspect-square"
              aria-label={shown ? card.emoji : t("mem.hidden")}
            >
              <motion.div
                className={cn(
                  "flex h-full w-full items-center justify-center rounded-xl border text-3xl sm:text-4xl",
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
          🎉 {t("mem.won", { moves: state.moves })}
        </div>
      )}
    </div>
  );
}
