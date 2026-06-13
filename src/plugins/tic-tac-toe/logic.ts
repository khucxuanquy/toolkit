import type { Board, Player } from "./types";

export const EMPTY_BOARD: Board = Array(9).fill(null);

/** All 8 winning index triplets. */
export const WIN_LINES: ReadonlyArray<readonly [number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export interface WinInfo {
  player: Player;
  line: readonly [number, number, number];
}

/**
 * Returns the winning player + line if three same marks are currently lined up.
 * Because marks expire over time there is no "draw" — play continues until
 * someone lines up three live marks.
 */
export function getWinner(board: Board): WinInfo | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    const ma = board[a];
    if (ma && board[b]?.player === ma.player && board[c]?.player === ma.player) {
      return { player: ma.player, line };
    }
  }
  return null;
}

/** Lifetime bounds (seconds) for the disappear-time slider. */
export const MIN_LIFETIME_S = 2;
export const MAX_LIFETIME_S = 10;
export const DEFAULT_LIFETIME_S = 5;
