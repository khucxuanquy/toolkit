import type { Vec2 } from "./types";
import { BALL_R } from "./entities/Ball";

/**
 * Table geometry in logical "play" coordinates: the felt playfield spans
 * (0,0)–(PLAY_W,PLAY_H); ball centres live in that space. The renderer adds the
 * RAIL offset and scales the whole world to the canvas.
 */
export const PLAY_W = 1000;
export const PLAY_H = 500;
export const RAIL = 46;
export const WORLD_W = PLAY_W + RAIL * 2;
export const WORLD_H = PLAY_H + RAIL * 2;

/** Cushion depth into the felt. Balls bounce off the cushion *nose* (this far
 *  in from the felt edge), so they never rest on top of the green bumpers. */
export const CUSHION = 16;

/** Visual pocket radius (drawn) and capture radius (gameplay). */
export const POCKET_VISUAL = 26;
export const POCKET_CAPTURE = BALL_R + 17;
/** Half-width of the cushion gap at each pocket mouth (no rail there). */
export const POCKET_GAP = 30;

/** Spots. */
export const HEAD_SPOT: Vec2 = { x: PLAY_W * 0.25, y: PLAY_H * 0.5 };
export const FOOT_SPOT: Vec2 = { x: PLAY_W * 0.75, y: PLAY_H * 0.5 };
/** Head string x — for break / ball-in-hand-behind-line if needed. */
export const HEAD_STRING_X = PLAY_W * 0.25;

export interface Pocket {
  pos: Vec2;
  corner: boolean;
}

export const POCKETS: Pocket[] = [
  { pos: { x: 0, y: 0 }, corner: true },
  { pos: { x: PLAY_W / 2, y: -2 }, corner: false },
  { pos: { x: PLAY_W, y: 0 }, corner: true },
  { pos: { x: 0, y: PLAY_H }, corner: true },
  { pos: { x: PLAY_W / 2, y: PLAY_H + 2 }, corner: false },
  { pos: { x: PLAY_W, y: PLAY_H }, corner: true },
];

/** True if x lies within a pocket gap along a horizontal rail (top/bottom). */
export function inHorizontalGap(x: number): boolean {
  return (
    Math.abs(x - 0) < POCKET_GAP ||
    Math.abs(x - PLAY_W / 2) < POCKET_GAP ||
    Math.abs(x - PLAY_W) < POCKET_GAP
  );
}

/** True if y lies within a pocket gap along a vertical rail (left/right). */
export function inVerticalGap(y: number): boolean {
  return Math.abs(y - 0) < POCKET_GAP || Math.abs(y - PLAY_H) < POCKET_GAP;
}
