import type { Vec2 } from "../types";

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

const POOL = 160;

/** Object-pooled sparkle/burst particles for pocket effects. */
export class ParticleSystem {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < POOL; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        maxLife: 1,
        size: 2,
        color: "#fff",
      });
    }
  }

  private acquire(): Particle | null {
    return this.pool.find((p) => !p.active) ?? null;
  }

  burst(pos: Vec2, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const s = speed * (0.4 + Math.random() * 0.6);
      p.active = true;
      p.x = pos.x;
      p.y = pos.y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.3;
      p.size = 2 + Math.random() * 3;
      p.color = color;
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - dt * 2.5;
      p.vy *= 1 - dt * 2.5;
    }
  }

  /** Draw in world (play) coordinates; caller sets the transform & offset. */
  draw(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(ox + p.x, oy + p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
