import type { Vec2 } from "../types";

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function dist2(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  return len === 0 ? { x: 0, y: -1 } : { x: v.x / len, y: v.y / len };
}

export function angleToVec(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}
