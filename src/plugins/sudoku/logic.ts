/** Sudoku generation & solving. A grid is a flat number[81]; 0 = empty. */

export type Grid = number[];
export type Difficulty = "easy" | "medium" | "hard";

/** Target number of given (pre-filled) cells per difficulty. */
const GIVENS: Record<Difficulty, number> = { easy: 40, medium: 32, hard: 26 };

const ROW = (i: number) => Math.floor(i / 9);
const COL = (i: number) => i % 9;
const BOX = (i: number) => Math.floor(ROW(i) / 3) * 3 + Math.floor(COL(i) / 3);

/** Whether `val` can be placed at index `i` without breaking row/col/box. */
export function canPlace(grid: Grid, i: number, val: number): boolean {
  const r = ROW(i);
  const c = COL(i);
  const b = BOX(i);
  for (let k = 0; k < 81; k += 1) {
    if (k === i || grid[k] === 0) continue;
    if (grid[k] !== val) continue;
    if (ROW(k) === r || COL(k) === c || BOX(k) === b) return false;
  }
  return true;
}

function shuffled(n: number[]): number[] {
  const a = [...n];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Backtracking solver; returns the number of solutions found, capped at `limit`. */
function countSolutions(grid: Grid, limit: number): number {
  const idx = grid.indexOf(0);
  if (idx === -1) return 1;
  let count = 0;
  for (let v = 1; v <= 9; v += 1) {
    if (canPlace(grid, idx, v)) {
      grid[idx] = v;
      count += countSolutions(grid, limit - count);
      grid[idx] = 0;
      if (count >= limit) break;
    }
  }
  return count;
}

/** Fill an empty grid with a random complete solution. */
function fillGrid(grid: Grid): boolean {
  const idx = grid.indexOf(0);
  if (idx === -1) return true;
  for (const v of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (canPlace(grid, idx, v)) {
      grid[idx] = v;
      if (fillGrid(grid)) return true;
      grid[idx] = 0;
    }
  }
  return false;
}

export interface Puzzle {
  puzzle: Grid; // with blanks (0)
  solution: Grid; // fully solved
}

/** Generate a puzzle with a unique solution for the given difficulty. */
export function generate(difficulty: Difficulty): Puzzle {
  const solution: Grid = new Array(81).fill(0);
  fillGrid(solution);

  const puzzle = [...solution];
  const target = GIVENS[difficulty];
  // Dig holes in a random order, keeping the solution unique.
  const order = shuffled([...Array(81).keys()]);
  let filled = 81;
  for (const i of order) {
    if (filled <= target) break;
    const backup = puzzle[i];
    puzzle[i] = 0;
    if (countSolutions([...puzzle], 2) !== 1) {
      puzzle[i] = backup; // removing it broke uniqueness — keep it
    } else {
      filled -= 1;
    }
  }
  return { puzzle, solution };
}

/** Indices (0..80) of cells that conflict with another filled cell. */
export function conflicts(grid: Grid): Set<number> {
  const bad = new Set<number>();
  for (let i = 0; i < 81; i += 1) {
    if (grid[i] === 0) continue;
    for (let k = i + 1; k < 81; k += 1) {
      if (grid[k] !== grid[i]) continue;
      if (ROW(k) === ROW(i) || COL(k) === COL(i) || BOX(k) === BOX(i)) {
        bad.add(i);
        bad.add(k);
      }
    }
  }
  return bad;
}

export function isComplete(grid: Grid): boolean {
  return grid.every((v) => v !== 0) && conflicts(grid).size === 0;
}

/** Count remaining (unplaced) instances of each digit 1..9. */
export function remainingCounts(grid: Grid): Record<number, number> {
  const counts: Record<number, number> = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
  for (const v of grid) if (v >= 1 && v <= 9) counts[v] -= 1;
  return counts;
}
