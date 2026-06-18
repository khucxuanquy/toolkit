"use client";

import { useEffect, useReducer, useRef } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { reportScore } from "@/core/firebase/realtime";
import { GameLeaderboard } from "@/shared/components/GameLeaderboard";
import { cn } from "@/shared/utils/cn";
import { canMove, move, newBoard, spawn, type Board, type Direction } from "./logic";
import { game2048Storage } from "./storage";

interface State {
  board: Board;
  score: number;
  best: number;
  won: boolean;
  over: boolean;
  keepPlaying: boolean;
}
type Action =
  | { type: "NEW" }
  | { type: "MOVE"; dir: Direction }
  | { type: "CONTINUE" }
  | { type: "HYDRATE"; best: number };

function init(best = 0): State {
  return { board: newBoard(), score: 0, best, won: false, over: false, keepPlaying: false };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEW":
      return init(state.best);
    case "HYDRATE":
      return { ...state, best: Math.max(state.best, action.best) };
    case "CONTINUE":
      return { ...state, won: false, keepPlaying: true };
    case "MOVE": {
      if (state.over || state.won) return state;
      const { board, gained, moved } = move(state.board, action.dir);
      if (!moved) return state;
      const won = !state.keepPlaying && board.includes(2048);
      const spawned = spawn(board);
      const score = state.score + gained;
      return {
        ...state,
        board: spawned,
        score,
        best: Math.max(state.best, score),
        won,
        over: !canMove(spawned),
      };
    }
    default:
      return state;
  }
}

const TILE: Record<number, string> = {
  2: "bg-surface-2 text-foreground",
  4: "bg-amber-200 text-amber-900",
  8: "bg-orange-300 text-white",
  16: "bg-orange-400 text-white",
  32: "bg-orange-500 text-white",
  64: "bg-red-500 text-white",
  128: "bg-yellow-400 text-white",
  256: "bg-yellow-500 text-white",
  512: "bg-lime-500 text-white",
  1024: "bg-primary text-white",
  2048: "bg-success text-white",
};

const KEY_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export default function Game2048Page() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, undefined, () => init());
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Load best (dispatch inside async callback — not a synchronous effect setState).
  useEffect(() => {
    let active = true;
    void game2048Storage.loadBest().then((b) => {
      if (active) dispatch({ type: "HYDRATE", best: b });
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist best (storage write, not state).
  useEffect(() => {
    void game2048Storage.saveBest(state.best);
  }, [state.best]);

  // Soft tick whenever tiles merge (score grows).
  const prevScore = useRef(0);
  useEffect(() => {
    if (state.score > prevScore.current) sound.tick();
    prevScore.current = state.score;
  }, [state.score]);

  // Win / game-over chimes.
  useEffect(() => {
    if (state.won) sound.win();
  }, [state.won]);
  useEffect(() => {
    if (state.over) {
      sound.lose();
      reportScore("2048", state.score);
    }
  }, [state.over, state.score]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = KEY_DIR[e.key];
      if (dir) {
        e.preventDefault();
        dispatch({ type: "MOVE", dir });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    const dir: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
    dispatch({ type: "MOVE", dir });
  };

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Stat label={t("g2048.score")} value={state.score} />
          <Stat label={t("g2048.best")} value={state.best} />
        </div>
        <Button variant="outline" size="sm" onClick={() => dispatch({ type: "NEW" })}>
          <Icon name="RotateCcw" size={15} /> {t("g2048.new")}
        </Button>
      </div>

      <div className="relative">
        <div
          className="bg-surface-2 grid grid-cols-4 gap-2 rounded-2xl p-2 select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {state.board.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl font-extrabold tabular-nums",
                v === 0 ? "bg-border/40" : (TILE[v] ?? "bg-success text-white"),
                v >= 1024 ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl",
              )}
            >
              {v !== 0 ? v : ""}
            </div>
          ))}
        </div>

        {(state.won || state.over) && (
          <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-sm">
            <p className="text-2xl font-bold">
              {state.won ? `🎉 ${t("g2048.won")}` : t("g2048.over")}
            </p>
            <div className="flex gap-2">
              {state.won && (
                <Button onClick={() => dispatch({ type: "CONTINUE" })}>
                  {t("g2048.continue")}
                </Button>
              )}
              <Button
                variant={state.won ? "outline" : "primary"}
                onClick={() => dispatch({ type: "NEW" })}
              >
                {t("g2048.new")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-muted text-center text-sm">{t("g2048.howto")}</p>

      <GameLeaderboard game="2048" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-2 min-w-20 rounded-xl px-3 py-1.5 text-center">
      <div className="text-muted text-xs tracking-wide uppercase">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
