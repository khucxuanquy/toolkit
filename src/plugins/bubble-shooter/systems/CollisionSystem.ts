import type { Vec2, GridPos } from "../types";
import type { GridSystem } from "./GridSystem";
import { BUBBLE_RADIUS } from "../entities/Bubble";

export interface CollisionResult {
  /** The grid bubble that was hit, or null if the ceiling was hit. */
  collidedWith: GridPos | null;
}

export class CollisionSystem {
  /**
   * Test whether the flying bubble at `flyPos` has collided with the ceiling
   * or any existing grid bubble.  Returns a result on hit, or null if clear.
   */
  check(flyPos: Vec2, grid: GridSystem, ceilingY: number): CollisionResult | null {
    // Ceiling
    if (flyPos.y - BUBBLE_RADIUS <= ceilingY) {
      return { collidedWith: null };
    }

    // Existing grid bubbles — threshold is slightly less than 2r to feel snappy
    const threshold = (BUBBLE_RADIUS * 2) * 0.95;
    const threshSq = threshold * threshold;

    let best: GridPos | null = null;
    let bestDist = Infinity;

    grid.forEach((b, row, col) => {
      if (b.popping || b.dropping) return;
      const dx = flyPos.x - b.pos.x;
      const dy = flyPos.y - b.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 <= threshSq && d2 < bestDist) {
        bestDist = d2;
        best = { row, col };
      }
    });

    return best ? { collidedWith: best } : null;
  }
}
