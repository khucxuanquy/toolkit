import type { Vec2 } from "./types";
import { angleOf, integrate, length, type PhysicsConfig } from "./Physics";

const SHAFT_LEN = 46;
const TRAIL_MAX = 14;

/**
 * A single arrow. Arrows are pooled by the game; `reset()` re-arms an instance.
 * Each arrow renders its own shaft, head, fletching, motion trail and — while
 * fast — speed streaks.
 */
export class Arrow {
  active = false;
  stuck = false;
  pos: Vec2 = { x: 0, y: 0 };
  vel: Vec2 = { x: 0, y: 0 };
  angle = 0;
  /** Closest-approach tracking while the tip is inside the target. */
  tracking = false;
  minDist = Infinity;
  minPos: Vec2 = { x: 0, y: 0 };
  /** Speed (px/s) recorded at the closest-approach point. */
  minSpeed = Infinity;
  /** Set once the arrow has sailed past the target without embedding. */
  passedTarget = false;
  /** When embedded in the target, ride along with it (moving mode). */
  attached = false;
  private offset: Vec2 = { x: 0, y: 0 };
  private trail: Vec2[] = [];
  private color = "#7c4a2d";

  reset(pos: Vec2, vel: Vec2, color = "#7c4a2d"): void {
    this.active = true;
    this.stuck = false;
    this.tracking = false;
    this.attached = false;
    this.passedTarget = false;
    this.minDist = Infinity;
    this.minSpeed = Infinity;
    this.minPos = { x: pos.x, y: pos.y };
    this.pos = { x: pos.x, y: pos.y };
    this.vel = { x: vel.x, y: vel.y };
    this.angle = angleOf(vel);
    this.color = color;
    this.trail = [];
  }

  /** Tip (head) position in world space. */
  tip(): Vec2 {
    return {
      x: this.pos.x + Math.cos(this.angle) * (SHAFT_LEN / 2),
      y: this.pos.y + Math.sin(this.angle) * (SHAFT_LEN / 2),
    };
  }

  update(cfg: PhysicsConfig, dt: number): void {
    if (!this.active || this.stuck) return;
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > TRAIL_MAX) this.trail.shift();
    integrate(this.pos, this.vel, cfg, dt);
    this.angle = angleOf(this.vel);
  }

  /** Freeze the arrow in place (embedded in target or ground). */
  embed(at: Vec2, angle: number): void {
    this.stuck = true;
    this.attached = false;
    this.pos = { x: at.x - Math.cos(angle) * (SHAFT_LEN / 2), y: at.y - Math.sin(angle) * (SHAFT_LEN / 2) };
    this.angle = angle;
    this.vel.x = 0;
    this.vel.y = 0;
    this.trail = [];
  }

  /** Pin this embedded arrow to the target so it rides along as it moves. */
  attachTo(center: Vec2): void {
    this.attached = true;
    this.offset = { x: this.pos.x - center.x, y: this.pos.y - center.y };
  }

  /** Reposition an attached arrow to follow the (moved) target centre. */
  followTarget(center: Vec2): void {
    if (!this.attached) return;
    this.pos = { x: center.x + this.offset.x, y: center.y + this.offset.y };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const speed = length(this.vel);

    // Motion trail (fading line through recent positions).
    if (!this.stuck && this.trail.length > 1) {
      ctx.save();
      ctx.lineCap = "round";
      for (let i = 1; i < this.trail.length; i++) {
        const a = this.trail[i - 1];
        const b = this.trail[i];
        ctx.strokeStyle = `rgba(255,255,255,${(i / this.trail.length) * 0.28})`;
        ctx.lineWidth = (i / this.trail.length) * 4;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);
    const half = SHAFT_LEN / 2;

    // Speed streaks behind a fast-moving arrow.
    if (!this.stuck && speed > 700) {
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const off = (i - 1) * 3;
        ctx.beginPath();
        ctx.moveTo(-half, off);
        ctx.lineTo(-half - 18, off);
        ctx.stroke();
      }
    }

    // Shaft.
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-half, 0);
    ctx.lineTo(half - 6, 0);
    ctx.stroke();

    // Steel head.
    ctx.fillStyle = "#cbd5e1";
    ctx.beginPath();
    ctx.moveTo(half, 0);
    ctx.lineTo(half - 9, -4);
    ctx.lineTo(half - 9, 4);
    ctx.closePath();
    ctx.fill();

    // Fletching.
    ctx.fillStyle = "#ef4444";
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(-half, 0);
      ctx.lineTo(-half + 10, s * 5);
      ctx.lineTo(-half + 4, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
