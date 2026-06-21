import type { BubbleColor, BubbleType } from "../types";

export interface LevelCell {
  color: BubbleColor;
  type: BubbleType;
}

export type LevelRow = (LevelCell | null)[];

export interface Level {
  id: number;
  label: string;
  rows: LevelRow[];
  /** How many colors active in this level. */
  colorCount: number;
}

const R: BubbleColor = "red";
const B: BubbleColor = "blue";
const G: BubbleColor = "green";
const Y: BubbleColor = "yellow";
const P: BubbleColor = "purple";
const O: BubbleColor = "orange";

function n(c: BubbleColor): LevelCell {
  return { color: c, type: "normal" };
}
function bomb(c: BubbleColor): LevelCell {
  return { color: c, type: "bomb" };
}
function stone(): LevelCell {
  return { color: "red", type: "stone" };
}
function lightning(c: BubbleColor): LevelCell {
  return { color: c, type: "lightning" };
}

export const LEVELS: Level[] = [
  {
    id: 1,
    label: "Level 1",
    colorCount: 3,
    rows: [
      [n(R), n(R), n(B), n(B), n(G), n(G), n(R), n(R)],
      [n(B), n(G), n(R), n(B), n(G), n(R), n(B)],
      [n(G), n(B), n(G), n(R), n(B), n(G), n(R), n(G)],
      [n(R), n(G), n(B), n(G), n(R), n(B), n(G)],
    ],
  },
  {
    id: 2,
    label: "Level 2",
    colorCount: 4,
    rows: [
      [n(R), n(B), n(G), n(Y), n(R), n(B), n(G), n(Y)],
      [n(Y), n(R), n(B), n(G), n(Y), n(R), n(B)],
      [n(G), n(Y), n(R), n(B), n(G), n(Y), n(R), n(G)],
      [n(B), n(G), n(Y), n(R), n(B), n(Y), n(G)],
      [null, stone(), null, stone(), null, stone(), null, null],
    ],
  },
  {
    id: 3,
    label: "Level 3",
    colorCount: 4,
    rows: [
      [n(R), n(R), n(B), n(B), n(G), n(G), n(Y), n(Y)],
      [n(B), n(R), n(G), n(B), n(Y), n(G), n(Y)],
      [n(Y), n(B), n(R), n(G), n(B), n(Y), n(R), n(B)],
      [stone(), n(G), stone(), n(Y), stone(), n(R), stone()],
      [n(G), n(Y), n(R), n(B), n(G), n(Y), n(R), n(G)],
    ],
  },
  {
    id: 4,
    label: "Level 4",
    colorCount: 5,
    rows: [
      [n(R), n(B), n(G), n(Y), n(P), n(R), n(B), n(G)],
      [n(P), n(R), n(Y), n(B), n(G), n(P), n(Y)],
      [n(B), n(G), n(P), n(R), n(Y), n(B), n(P), n(G)],
      [bomb(R), n(Y), n(G), stone(), n(B), n(P), bomb(B)],
      [n(G), n(P), n(R), n(Y), n(G), n(B), n(R), n(P)],
    ],
  },
  {
    id: 5,
    label: "Level 5",
    colorCount: 6,
    rows: [
      [n(R), n(B), n(G), n(Y), n(P), n(O), n(R), n(B)],
      [n(O), n(R), n(B), n(G), n(Y), n(P), n(O)],
      [n(P), n(O), n(R), n(B), n(G), n(Y), n(P), n(O)],
      [stone(), stone(), stone(), n(O), stone(), stone(), stone()],
      [lightning(R), n(G), n(Y), n(P), n(O), n(B), lightning(G), n(R)],
      [n(Y), n(P), n(O), n(R), n(B), n(G), n(Y)],
    ],
  },
];

export class LevelManager {
  private currentLevel = 0;

  get level(): Level {
    return LEVELS[Math.min(this.currentLevel, LEVELS.length - 1)];
  }

  get levelIndex(): number {
    return this.currentLevel;
  }

  get totalLevels(): number {
    return LEVELS.length;
  }

  next(): boolean {
    if (this.currentLevel < LEVELS.length - 1) {
      this.currentLevel++;
      return true;
    }
    return false;
  }

  reset(): void {
    this.currentLevel = 0;
  }

  setLevel(n: number): void {
    this.currentLevel = Math.max(0, Math.min(n, LEVELS.length - 1));
  }
}
