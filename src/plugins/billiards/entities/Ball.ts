import type { Vec2 } from "../types";
import { randomOrient, type Mat3 } from "../utils/math";

export const BALL_R = 11.5;

/** Standard pool ball base colours, indexed by number (stripes reuse 1–7). */
const BASE_COLORS: Record<number, string> = {
  1: "#f4c20d", // yellow
  2: "#0b5cab", // blue
  3: "#d22d2d", // red
  4: "#6a2c8f", // purple
  5: "#e3760f", // orange
  6: "#13703a", // green
  7: "#7c2118", // maroon
  8: "#1a1a1a", // black
};

export function ballBaseColor(num: number): string {
  if (num === 0) return "#fbfbf5"; // cue
  if (num <= 8) return BASE_COLORS[num];
  return BASE_COLORS[num - 8]; // 9–15 stripe over base 1–7
}

/**
 * A single billiard ball. Pooled for the duration of a rack; physics mutates
 * `pos`/`vel` in place. The cue ball (num 0) also carries spin state.
 */
export class Ball {
  readonly num: number;
  pos: Vec2;
  vel: Vec2 = { x: 0, y: 0 };
  pocketed = false;

  // Pocket sink animation (visual only)
  sinking = false;
  sinkT = 0;
  sinkAt: Vec2 = { x: 0, y: 0 };

  // Cue-ball spin (English), applied on first object-ball contact.
  spinX = 0; // -1 left .. +1 right
  spinY = 0; // -1 draw .. +1 follow
  spinPending = false;

  /** Surface orientation (3×3 matrix) for the rolling visual. */
  orient: Mat3 = randomOrient();

  constructor(num: number, x: number, y: number) {
    this.num = num;
    this.pos = { x, y };
  }

  get isCue(): boolean {
    return this.num === 0;
  }
  get isStripe(): boolean {
    return this.num >= 9 && this.num <= 15;
  }
  get isSolid(): boolean {
    return this.num >= 1 && this.num <= 7;
  }
  get color(): string {
    return ballBaseColor(this.num);
  }
  get speed(): number {
    return Math.hypot(this.vel.x, this.vel.y);
  }

  stop(): void {
    this.vel.x = 0;
    this.vel.y = 0;
  }
}
