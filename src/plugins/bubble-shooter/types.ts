export type BubbleColor = "red" | "blue" | "green" | "yellow" | "purple" | "orange";
export type BubbleType = "normal" | "bomb" | "rainbow" | "stone" | "lightning";
export type GameMode = "classic" | "level" | "timed" | "survival";
export type GameStatus = "idle" | "playing" | "paused" | "over" | "win";
export type SoundName = "shoot" | "bounce" | "attach" | "pop" | "combo" | "game_over";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  row: number;
  col: number;
}

export const COLORS: BubbleColor[] = ["red", "blue", "green", "yellow", "purple", "orange"];

export const COLOR_FILL: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
  rainbow: "#e2e8f0",
  bomb: "#1e293b",
  stone: "#6b7280",
  lightning: "#fde047",
};

export const COLOR_LIGHT: Record<string, string> = {
  red: "#fca5a5",
  blue: "#93c5fd",
  green: "#86efac",
  yellow: "#fde047",
  purple: "#d8b4fe",
  orange: "#fdba74",
  rainbow: "#ffffff",
  bomb: "#475569",
  stone: "#9ca3af",
  lightning: "#fef08a",
};

/** Localizable UI strings for the bubble shooter (canvas text). */
export interface BubbleStrings {
  classic: string;
  level: string;
  timed: string;
  survival: string;
  best: string; // "Best"
  left: string; // suffix word in "{n} left"
  combo: string; // template with {n}, e.g. "COMBO ×{n}! 🔥"
  comboFloat: string; // template with {n}, e.g. "×{n} COMBO!"
  youWin: string;
  gameOver: string;
  bestColon: string; // template with {n}, e.g. "Best: {n}"
  tapPlayAgain: string;
  paused: string;
  tapResume: string;
  next: string; // "NEXT"
}

export const DEFAULT_BUBBLE_STRINGS: BubbleStrings = {
  classic: "Classic",
  level: "Level",
  timed: "Timed",
  survival: "Survival",
  best: "Best",
  left: "left",
  combo: "COMBO ×{n}! 🔥",
  comboFloat: "×{n} COMBO!",
  youWin: "🎉 You Win!",
  gameOver: "💥 Game Over",
  bestColon: "Best: {n}",
  tapPlayAgain: "Tap to play again",
  paused: "⏸ Paused",
  tapResume: "Tap to resume",
  next: "NEXT",
};

export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
