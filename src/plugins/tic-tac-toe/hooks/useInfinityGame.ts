"use client";

import { useEffect, useMemo, useReducer } from "react";
import { sound } from "@/shared/lib/sound";
import { EMPTY_BOARD, getWinner, MAX_LIFETIME_S, MIN_LIFETIME_S } from "../logic";
import { ticTacToeStorage, DEFAULT_SCORES, DEFAULT_SETTINGS } from "../storage";
import type { Board, Player, Scores } from "../types";

/** How often we check for expired marks (ms). */
const EXPIRY_TICK_MS = 80;

interface State {
  board: Board;
  current: Player;
  scores: Scores;
  winner: { player: Player; line: readonly number[] } | null;
  lifetimeMs: number;
  hydrated: boolean;
}

type Action =
  | { type: "HYDRATE"; scores: Scores; lifetimeMs: number }
  | { type: "PLAY"; index: number; at: number }
  | { type: "EXPIRE"; now: number }
  | { type: "RESTART" }
  | { type: "RESET_SCORES" }
  | { type: "SET_LIFETIME"; ms: number };

const initialState: State = {
  board: EMPTY_BOARD,
  current: "X",
  scores: DEFAULT_SCORES,
  winner: null,
  lifetimeMs: DEFAULT_SETTINGS.lifetimeMs,
  hydrated: false,
};

const other = (p: Player): Player => (p === "X" ? "O" : "X");

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, scores: action.scores, lifetimeMs: action.lifetimeMs, hydrated: true };

    case "PLAY": {
      if (state.winner || state.board[action.index]) return state;
      const board = state.board.slice();
      board[action.index] = { player: state.current, placedAt: action.at };
      const win = getWinner(board);
      if (win) {
        return {
          ...state,
          board,
          winner: { player: win.player, line: win.line },
          scores: { ...state.scores, [win.player]: state.scores[win.player] + 1 },
        };
      }
      return { ...state, board, current: other(state.current) };
    }

    case "EXPIRE": {
      if (state.winner) return state; // freeze once the game is won
      let changed = false;
      const board = state.board.map((mark) => {
        if (mark && action.now - mark.placedAt >= state.lifetimeMs) {
          changed = true;
          return null;
        }
        return mark;
      });
      return changed ? { ...state, board } : state;
    }

    case "RESTART":
      return { ...state, board: EMPTY_BOARD, current: "X", winner: null };

    case "RESET_SCORES":
      return { ...state, scores: DEFAULT_SCORES };

    case "SET_LIFETIME": {
      const ms = Math.min(MAX_LIFETIME_S * 1000, Math.max(MIN_LIFETIME_S * 1000, action.ms));
      return { ...state, lifetimeMs: ms };
    }

    default:
      return state;
  }
}

export function useInfinityGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { board, current, scores, winner, lifetimeMs, hydrated } = state;

  const gameOver = winner !== null;
  const hasMarks = useMemo(() => board.some(Boolean), [board]);

  // Hydrate persisted scores + settings once.
  useEffect(() => {
    let active = true;
    void (async () => {
      const [s, settings] = await Promise.all([
        ticTacToeStorage.loadScores(),
        ticTacToeStorage.loadSettings(),
      ]);
      if (active) dispatch({ type: "HYDRATE", scores: s, lifetimeMs: settings.lifetimeMs });
    })();
    return () => {
      active = false;
    };
  }, []);

  // Write-through persistence after hydration.
  useEffect(() => {
    if (hydrated) void ticTacToeStorage.saveScores(scores);
  }, [scores, hydrated]);
  useEffect(() => {
    if (hydrated) void ticTacToeStorage.saveSettings({ lifetimeMs });
  }, [lifetimeMs, hydrated]);

  // Expire marks on an interval while a game is in progress.
  useEffect(() => {
    if (gameOver || !hasMarks) return;
    const id = setInterval(() => dispatch({ type: "EXPIRE", now: Date.now() }), EXPIRY_TICK_MS);
    return () => clearInterval(id);
  }, [gameOver, hasMarks]);

  // Victory chime when a winner appears.
  useEffect(() => {
    if (winner) sound.win();
  }, [winner]);

  return {
    board,
    current,
    scores,
    winner,
    lifetimeMs,
    gameOver,
    hydrated,
    play: (index: number) => {
      if (winner || board[index]) return;
      sound.place();
      dispatch({ type: "PLAY", index, at: Date.now() });
    },
    restart: () => dispatch({ type: "RESTART" }),
    resetScores: () => dispatch({ type: "RESET_SCORES" }),
    setLifetime: (ms: number) => dispatch({ type: "SET_LIFETIME", ms }),
  };
}
