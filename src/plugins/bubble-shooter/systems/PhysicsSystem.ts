import type { Vec2 } from "../types";

export const SHOOT_SPEED = 900; // px / s — no gravity in bubble shooter

export class PhysicsSystem {
  /**
   * Advance `pos` by `vel * dt`. Bounce off left/right walls.
   * Returns true if a wall bounce occurred this step.
   */
  update(pos: Vec2, vel: Vec2, dt: number, leftWall: number, rightWall: number, radius: number): boolean {
    pos.x += vel.x * dt;
    pos.y += vel.y * dt;

    let bounced = false;
    if (pos.x - radius <= leftWall) {
      pos.x = leftWall + radius;
      vel.x = Math.abs(vel.x);
      bounced = true;
    } else if (pos.x + radius >= rightWall) {
      pos.x = rightWall - radius;
      vel.x = -Math.abs(vel.x);
      bounced = true;
    }
    return bounced;
  }
}
