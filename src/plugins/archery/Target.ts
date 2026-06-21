import type { GameMode, Vec2 } from "./types";
import { clamp } from "./types";

/** Olympic ring band colours, indexed by ring number 1..10. */
function ringFill(ring: number): string {
  if (ring >= 9) return "#f7d33b"; // gold (9,10)
  if (ring >= 7) return "#e5484d"; // red (7,8)
  if (ring >= 5) return "#3b82f6"; // blue (5,6)
  if (ring >= 3) return "#1f2937"; // black (3,4)
  return "#f8fafc"; // white (1,2)
}

/**
 * An Olympic-style 10-ring target. Supports horizontal motion (moving mode),
 * an impact shake, and distance-based scoring.
 */
export class Target {
  center: Vec2 = { x: 0, y: 0 };
  radius = 90;
  private baseX = 0;
  private baseY = 0;
  private t = 0;
  private shake = 0;
  private mode: GameMode = "practice";
  private span = 0; // horizontal travel half-range for moving mode

  setLayout(x: number, y: number, radius: number, width: number): void {
    this.baseX = x;
    this.baseY = y;
    this.radius = radius;
    this.span = Math.min(width * 0.14, 120);
    if (this.mode !== "moving") {
      this.center = { x, y };
    }
  }

  setMode(mode: GameMode): void {
    this.mode = mode;
    if (mode !== "moving") this.center = { x: this.baseX, y: this.baseY };
  }

  hit(): void {
    this.shake = 1;
  }

  update(dt: number): void {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 3);
    if (this.mode === "moving") {
      this.center.x = this.baseX + Math.sin(this.t * 1.1) * this.span;
      this.center.y = this.baseY + Math.cos(this.t * 0.7) * (this.span * 0.35);
    }
  }

  /** Ring number 1..10 for a centre distance, or 0 if outside the target. */
  ringForDistance(d: number): number {
    if (d > this.radius) return 0;
    return clamp(10 - Math.floor(d / (this.radius / 10)), 1, 10);
  }

  /** Ring number 1..10 for a point, or 0 if outside the target. */
  scoreAt(p: Vec2): number {
    return this.ringForDistance(Math.hypot(p.x - this.center.x, p.y - this.center.y));
  }

  contains(p: Vec2): boolean {
    return Math.hypot(p.x - this.center.x, p.y - this.center.y) <= this.radius;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const sx = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 8 : 0;
    const sy = this.shake > 0 ? (Math.random() - 0.5) * this.shake * 8 : 0;
    const cx = this.center.x + sx;
    const cy = this.center.y + sy;

    // Stand.
    ctx.save();
    ctx.strokeStyle = "#6b4f2a";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - this.radius * 0.5, cy + this.radius);
    ctx.lineTo(cx, cy + this.radius * 0.4);
    ctx.moveTo(cx + this.radius * 0.5, cy + this.radius);
    ctx.lineTo(cx, cy + this.radius * 0.4);
    ctx.stroke();

    // Rings, outer → inner.
    for (let ring = 1; ring <= 10; ring++) {
      const r = this.radius * (1 - (ring - 1) / 10);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = ringFill(ring);
      ctx.fill();
      // Ring divider lines for definition.
      ctx.lineWidth = 1;
      ctx.strokeStyle = ring <= 2 ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.25)";
      ctx.stroke();
    }
    // Centre dot.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius * 0.03, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
