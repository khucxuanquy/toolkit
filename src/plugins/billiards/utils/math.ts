import type { Vec2 } from "../types";
import { TAU } from "../types";

export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const scale = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const len = (a: Vec2): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);
export const dist2 = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export function norm(a: Vec2): Vec2 {
  const l = Math.hypot(a.x, a.y);
  return l < 1e-9 ? { x: 1, y: 0 } : { x: a.x / l, y: a.y / l };
}

/** Perpendicular (rotate +90°). */
export const perp = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/**
 * A ball's surface orientation is a 3×3 rotation matrix (row-major, 9 numbers).
 * Rolling rotates it about an in-plane axis; the renderer projects the rotated
 * surface features (number patches, stripe band, cue spots) to fake 3D rolling.
 */
export type Mat3 = number[];

/** Rotate orientation `m` in place by `ang` about unit axis (ax,ay,az): m = R·m. */
export function rotateOrient(m: Mat3, ax: number, ay: number, az: number, ang: number): void {
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = 1 - c;
  const r = [
    t * ax * ax + c, t * ax * ay - s * az, t * ax * az + s * ay,
    t * ax * ay + s * az, t * ay * ay + c, t * ay * az - s * ax,
    t * ax * az - s * ay, t * ay * az + s * ax, t * az * az + c,
  ];
  const out = new Array(9);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i * 3 + j] = r[i * 3] * m[j] + r[i * 3 + 1] * m[3 + j] + r[i * 3 + 2] * m[6 + j];
    }
  }
  for (let k = 0; k < 9; k++) m[k] = out[k];
}

/** A random surface orientation so balls don't all start facing the same way. */
export function randomOrient(): Mat3 {
  const m: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  rotateOrient(m, 1, 0, 0, Math.random() * TAU);
  rotateOrient(m, 0, 1, 0, Math.random() * TAU);
  rotateOrient(m, 0, 0, 1, Math.random() * TAU);
  return m;
}

/** Shortest distance from point p to segment a→b. */
export function pointSegDist(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const len2 = abx * abx + aby * aby;
  let t = len2 > 0 ? (apx * abx + apy * aby) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const cx = a.x + abx * t;
  const cy = a.y + aby * t;
  return Math.hypot(p.x - cx, p.y - cy);
}
