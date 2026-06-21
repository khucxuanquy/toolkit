import type { Ball } from "../entities/Ball";
import { BALL_R } from "../entities/Ball";
import type { Vec2 } from "../types";
import { PLAY_W, PLAY_H, CUSHION } from "../Table";
import { norm, sub } from "../utils/math";

export interface AimTrace {
  /** Poly-line points the cue ball centre will travel (with one reflection). */
  segments: Vec2[];
  /** Ghost-ball centre at first object-ball contact, if any. */
  ghost: Vec2 | null;
  /** Predicted direction the struck object ball will travel. */
  targetDir: Vec2 | null;
  /** The object ball that would be struck. */
  targetBall: Ball | null;
}

const MIN = CUSHION + BALL_R;
const MAXX = PLAY_W - CUSHION - BALL_R;
const MAXY = PLAY_H - CUSHION - BALL_R;

/** Ray vs circle (radius rr). Returns nearest forward t or null. */
function rayCircle(o: Vec2, d: Vec2, c: Vec2, rr: number): number | null {
  const mx = o.x - c.x;
  const my = o.y - c.y;
  const b = mx * d.x + my * d.y;
  const cc = mx * mx + my * my - rr * rr;
  if (cc > 0 && b > 0) return null; // pointing away, outside
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t < 0 ? null : t;
}

/** Ray vs the centre-bounds rectangle. Returns t and which axis was hit. */
function rayRect(o: Vec2, d: Vec2): { t: number; axis: "x" | "y" } {
  let bestT = Infinity;
  let axis: "x" | "y" = "x";
  if (d.x > 1e-9) {
    const t = (MAXX - o.x) / d.x;
    if (t >= 0 && t < bestT) {
      bestT = t;
      axis = "x";
    }
  } else if (d.x < -1e-9) {
    const t = (MIN - o.x) / d.x;
    if (t >= 0 && t < bestT) {
      bestT = t;
      axis = "x";
    }
  }
  if (d.y > 1e-9) {
    const t = (MAXY - o.y) / d.y;
    if (t >= 0 && t < bestT) {
      bestT = t;
      axis = "y";
    }
  } else if (d.y < -1e-9) {
    const t = (MIN - o.y) / d.y;
    if (t >= 0 && t < bestT) {
      bestT = t;
      axis = "y";
    }
  }
  return { t: bestT, axis };
}

/**
 * Trace the cue ball's aim line: a single straight line from the cue ball to the
 * first object-ball contact (with ghost ball + predicted target direction), or
 * to the first cushion if no ball is in the way. No reflections.
 */
export function traceAim(cue: Ball, balls: Ball[], dir: Vec2): AimTrace {
  const o: Vec2 = { x: cue.pos.x, y: cue.pos.y };

  let tBall = Infinity;
  let hit: Ball | null = null;
  for (const b of balls) {
    if (b.pocketed || b.isCue) continue;
    const t = rayCircle(o, dir, b.pos, BALL_R * 2);
    if (t !== null && t < tBall) {
      tBall = t;
      hit = b;
    }
  }

  const { t: tWall } = rayRect(o, dir);

  if (hit && tBall <= tWall) {
    const cp = { x: o.x + dir.x * tBall, y: o.y + dir.y * tBall };
    return {
      segments: [o, cp],
      ghost: cp,
      targetDir: norm(sub(hit.pos, cp)),
      targetBall: hit,
    };
  }

  const wp = { x: o.x + dir.x * tWall, y: o.y + dir.y * tWall };
  return { segments: [o, wp], ghost: null, targetDir: null, targetBall: null };
}
