import type { Vec2 } from "./types";

/**
 * Ballistic physics for arrows. All values are in CSS pixels and seconds, and
 * every step is delta-time based so motion is frame-rate independent.
 */
export interface PhysicsConfig {
  /** Downward acceleration (px / s²). */
  gravity: number;
  /** Horizontal wind acceleration (px / s², signed). */
  wind: number;
  /** Fractional velocity loss per second from air resistance. */
  drag: number;
}

export const DEFAULT_PHYSICS: PhysicsConfig = {
  gravity: 900,
  wind: 0,
  drag: 0.12,
};

/** Advance position & velocity one step under gravity, wind and drag. */
export function integrate(pos: Vec2, vel: Vec2, cfg: PhysicsConfig, dt: number): void {
  vel.x += cfg.wind * dt;
  vel.y += cfg.gravity * dt;
  const d = Math.max(0, 1 - cfg.drag * dt);
  vel.x *= d;
  vel.y *= d;
  pos.x += vel.x * dt;
  pos.y += vel.y * dt;
}

export const angleOf = (v: Vec2): number => Math.atan2(v.y, v.x);

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export const dist = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

/** Normalise a vector (returns {1,0} for a zero vector). */
export function normalize(v: Vec2): Vec2 {
  const l = Math.hypot(v.x, v.y);
  return l < 1e-6 ? { x: 1, y: 0 } : { x: v.x / l, y: v.y / l };
}
