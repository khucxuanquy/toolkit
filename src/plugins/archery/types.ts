/**
 * Shared types for the archery game engine. The engine is framework-agnostic
 * and renders entirely to a single HTML5 canvas.
 */

/** The lifecycle contract every embeddable game exposes. */
export interface GamePlugin {
  init(container: HTMLElement): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}

export type GameMode = "practice" | "moving" | "challenge";

export interface Vec2 {
  x: number;
  y: number;
}

export type SoundName = "draw" | "release" | "arrow_fly" | "hit" | "bullseye";

/** Logical layout computed each frame from the current canvas size. */
export interface Layout {
  width: number;
  height: number;
  groundY: number;
  anchor: Vec2; // bow grip
  targetX: number;
  targetY: number;
  targetRadius: number;
}

/** A clickable on-canvas button. */
export interface UIButton {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  active?: boolean;
}

/** Localizable UI strings for the archery game (canvas text). */
export interface ArcheryStrings {
  practice: string;
  moving: string;
  challenge: string;
  wind: string;
  finalScore: string;
  playAgain: string;
}

export const DEFAULT_ARCHERY_STRINGS: ArcheryStrings = {
  practice: "Practice",
  moving: "Moving",
  challenge: "Challenge",
  wind: "WIND",
  finalScore: "Final Score",
  playAgain: "Tap to play again",
};

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
