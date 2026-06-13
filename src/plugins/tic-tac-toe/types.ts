export type Player = "X" | "O";

/** A placed mark, remembered with the time it was placed so it can expire. */
export interface Mark {
  player: Player;
  placedAt: number;
}

export type Board = (Mark | null)[]; // length 9

export interface Scores {
  X: number;
  O: number;
}

export interface TicTacToeSettings {
  /** How long a mark survives before it disappears, in milliseconds. */
  lifetimeMs: number;
}
