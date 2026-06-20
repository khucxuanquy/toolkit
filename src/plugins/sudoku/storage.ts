import { createNamespace } from "@/core/storage/storage";
import type { Difficulty, Grid } from "./logic";

const store = createNamespace("sudoku");

export interface SavedGame {
  difficulty: Difficulty;
  puzzle: Grid; // givens (0 = blank), immutable cells
  solution: Grid;
  cells: Grid; // current player entries
  notes: number[][]; // pencil marks per cell
  elapsed: number; // seconds
  mistakes: number;
}

export const sudokuStorage = {
  loadGame: () => store.load<SavedGame | null>("game", null),
  saveGame: (g: SavedGame) => store.save("game", g),
  clearGame: () => store.remove("game"),
  loadBest: () => store.load<Record<string, number>>("best", {}),
  saveBest: (b: Record<string, number>) => store.save("best", b),
};
