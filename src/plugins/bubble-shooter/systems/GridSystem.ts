import { Bubble, BUBBLE_RADIUS, BUBBLE_DIAMETER, ROW_HEIGHT } from "../entities/Bubble";
import type { BubbleColor, BubbleType, GridPos } from "../types";
import { bfsConnected, findUnreachable } from "../utils/floodFill";

export const COLS_EVEN = 8;
export const COLS_ODD = 7;
export const MAX_ROWS = 20;

type GridRow = (Bubble | null)[];

export class GridSystem {
  private grid: GridRow[] = [];
  offsetX = 0;
  ceilingY = 0;

  constructor() {
    this.initGrid();
  }

  private initGrid(): void {
    this.grid = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      this.grid[r] = new Array(r % 2 === 0 ? COLS_EVEN : COLS_ODD).fill(null);
    }
  }

  setLayout(canvasWidth: number, ceilingY: number): void {
    const gridWidth = COLS_EVEN * BUBBLE_DIAMETER;
    this.offsetX = Math.max(0, (canvasWidth - gridWidth) / 2);
    this.ceilingY = ceilingY;
  }

  /** World-space centre for grid cell. */
  cellPos(row: number, col: number): { x: number; y: number } {
    const xOffset = row % 2 === 1 ? BUBBLE_RADIUS : 0;
    return {
      x: this.offsetX + BUBBLE_RADIUS + col * BUBBLE_DIAMETER + xOffset,
      y: this.ceilingY + BUBBLE_RADIUS + row * ROW_HEIGHT,
    };
  }

  colsInRow(row: number): number {
    return row % 2 === 0 ? COLS_EVEN : COLS_ODD;
  }

  valid(row: number, col: number): boolean {
    if (row < 0 || row >= MAX_ROWS) return false;
    return col >= 0 && col < this.colsInRow(row);
  }

  get(row: number, col: number): Bubble | null {
    if (!this.valid(row, col)) return null;
    return this.grid[row][col] ?? null;
  }

  set(row: number, col: number, bubble: Bubble | null): void {
    if (!this.valid(row, col)) return;
    if (bubble) bubble.gridPos = { row, col };
    this.grid[row][col] = bubble;
  }

  /** All 6 hex neighbours of (row, col). Offset: odd rows shifted right. */
  neighbors(row: number, col: number): GridPos[] {
    const odd = row % 2 === 1;
    const candidates: GridPos[] = [
      { row, col: col - 1 },
      { row, col: col + 1 },
      { row: row - 1, col: odd ? col : col - 1 },
      { row: row - 1, col: odd ? col + 1 : col },
      { row: row + 1, col: odd ? col : col - 1 },
      { row: row + 1, col: odd ? col + 1 : col },
    ];
    return candidates.filter((p) => this.valid(p.row, p.col));
  }

  /** BFS: cells connected to (row,col) sharing the same matchable color. */
  findConnected(row: number, col: number): GridPos[] {
    const start = this.get(row, col);
    if (!start || start.type === "stone") return [];
    const targetColor = start.color;
    const isRainbowShot = start.type === "rainbow";

    return bfsConnected<GridPos>(
      { row, col },
      (p) => `${p.row},${p.col}`,
      (p) => this.neighbors(p.row, p.col),
      (p) => {
        const b = this.get(p.row, p.col);
        if (!b || b.type === "stone") return false;
        if (isRainbowShot) return true; // rainbow matches all
        if (b.type === "rainbow") return true; // rainbow in grid passes through
        return b.color === targetColor;
      },
    );
  }

  /**
   * Returns all occupied positions not connected (directly or transitively)
   * to any bubble in row 0.  These are "floating" after a match is removed.
   */
  findFloatingClusters(): GridPos[] {
    // Seed: all filled cells in row 0
    const seeds: GridPos[] = [];
    for (let c = 0; c < COLS_EVEN; c++) {
      if (this.get(0, c)) seeds.push({ row: 0, col: c });
    }

    const all = this.allPositions();
    return findUnreachable(
      seeds,
      all,
      (p) => `${p.row},${p.col}`,
      (p) => this.neighbors(p.row, p.col).filter((n) => !!this.get(n.row, n.col)),
    );
  }

  /** Remove bubbles at the given positions; return them for animation. */
  removeCluster(cells: GridPos[]): Bubble[] {
    const removed: Bubble[] = [];
    for (const { row, col } of cells) {
      const b = this.get(row, col);
      if (b) { removed.push(b); this.set(row, col, null); }
    }
    return removed;
  }

  /**
   * Nearest empty cell to `worldPos`, choosing only from candidates adjacent
   * to `collidedWith` (or from rows 0–1 if ceiling hit).
   */
  snapPos(worldPos: { x: number; y: number }, collidedWith: GridPos | null): GridPos | null {
    let candidates: GridPos[];

    if (collidedWith) {
      candidates = this.neighbors(collidedWith.row, collidedWith.col).filter(
        (p) => !this.get(p.row, p.col),
      );
    } else {
      // Ceiling hit — look at the top few rows
      candidates = [];
      for (let r = 0; r <= 2; r++) {
        const cols = this.colsInRow(r);
        for (let c = 0; c < cols; c++) {
          if (!this.get(r, c)) candidates.push({ row: r, col: c });
        }
      }
    }

    if (!candidates.length) return null;

    let best: GridPos | null = null;
    let bestD = Infinity;
    for (const p of candidates) {
      const cp = this.cellPos(p.row, p.col);
      const d = Math.hypot(worldPos.x - cp.x, worldPos.y - cp.y);
      if (d < bestD) { bestD = d; best = p; }
    }
    return best;
  }

  /** All filled grid positions. */
  allPositions(): GridPos[] {
    const result: GridPos[] = [];
    for (let r = 0; r < MAX_ROWS; r++) {
      const cols = this.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (this.get(r, c)) result.push({ row: r, col: c });
      }
    }
    return result;
  }

  /** Iterate all occupied cells. */
  forEach(cb: (b: Bubble, row: number, col: number) => void): void {
    for (let r = 0; r < MAX_ROWS; r++) {
      const cols = this.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        const b = this.get(r, c);
        if (b) cb(b, r, c);
      }
    }
  }

  /** Highest occupied row index (0 = ceiling). Returns -1 if grid empty. */
  lowestRow(): number {
    for (let r = MAX_ROWS - 1; r >= 0; r--) {
      const cols = this.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (this.get(r, c)) return r;
      }
    }
    return -1;
  }

  isEmpty(): boolean {
    return this.lowestRow() === -1;
  }

  /** True when any bubble is at or below `dangerRow`. */
  hasBubbleBelowRow(dangerRow: number): boolean {
    for (let r = dangerRow; r < MAX_ROWS; r++) {
      const cols = this.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        if (this.get(r, c)) return true;
      }
    }
    return false;
  }

  /** Add a new row at position 0, shifting everything else down. */
  addRowAtTop(colors: (BubbleColor | null)[], types?: (BubbleType | null)[]): void {
    // Shift rows down (drop last row off)
    for (let r = MAX_ROWS - 1; r >= 1; r--) {
      this.grid[r] = this.grid[r - 1];
      const cols = this.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        const b = this.grid[r][c];
        if (b?.gridPos) b.gridPos.row = r;
      }
    }
    // Create new row 0
    const cols = COLS_EVEN;
    this.grid[0] = new Array(cols).fill(null);
    for (let c = 0; c < Math.min(colors.length, cols); c++) {
      const color = colors[c];
      if (!color) continue;
      const type: BubbleType = (types?.[c] as BubbleType) ?? "normal";
      const b = new Bubble(color, type);
      b.stuck = true;
      b.active = true;
      const p = this.cellPos(0, c);
      b.pos = { x: p.x, y: p.y };
      this.set(0, c, b);
    }
  }

  /**
   * Explode bomb: remove all bubbles in `radius` grid-steps from center,
   * including stones. Returns removed bubbles.
   */
  bombExplode(row: number, col: number): Bubble[] {
    // BFS up to distance 1 (immediate neighbours + self)
    const targets: GridPos[] = [{ row, col }, ...this.neighbors(row, col)];
    return this.removeCluster(targets.filter((p) => !!this.get(p.row, p.col)));
  }

  /** Lightning: remove all bubbles in the same row. Returns removed bubbles. */
  lightningClear(row: number): Bubble[] {
    const cols = this.colsInRow(row);
    const targets: GridPos[] = [];
    for (let c = 0; c < cols; c++) {
      if (this.get(row, c)) targets.push({ row, col: c });
    }
    return this.removeCluster(targets);
  }

  clear(): void {
    this.initGrid();
  }
}
