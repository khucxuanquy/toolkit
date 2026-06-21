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
  gravity: number;
  type: "dot" | "ring" | "text";
  text?: string;
}

const POOL = 300;

export class ParticleRenderer {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < POOL; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1,
        size: 4, color: "#fff",
        gravity: 0,
        type: "dot",
      });
    }
  }

  private acquire(): Particle | null {
    return this.pool.find((p) => !p.active) ?? null;
  }

  /** Colourful burst on bubble pop. */
  spawnBurst(pos: Vec2, color: string, count: number, speed: number): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
      const s = speed * (0.5 + Math.random() * 0.5);
      p.active = true;
      p.x = pos.x; p.y = pos.y;
      p.vx = Math.cos(angle) * s;
      p.vy = Math.sin(angle) * s;
      p.life = 0; p.maxLife = 0.35 + Math.random() * 0.25;
      p.size = 3 + Math.random() * 5;
      p.color = color;
      p.gravity = 260;
      p.type = "dot";
    }
  }

  /** Expanding ring at impact. */
  spawnRing(pos: Vec2, color: string): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true;
    p.x = pos.x; p.y = pos.y;
    p.vx = 0; p.vy = 0;
    p.life = 0; p.maxLife = 0.3;
    p.size = 22; // start radius
    p.color = color;
    p.gravity = 0;
    p.type = "ring";
  }

  /** Floating score/combo text. */
  spawnText(pos: Vec2, text: string, color: string): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true;
    p.x = pos.x; p.y = pos.y;
    p.vx = (Math.random() - 0.5) * 30;
    p.vy = -70 - Math.random() * 40;
    p.life = 0; p.maxLife = 1.0;
    p.size = 20;
    p.color = color;
    p.gravity = 0;
    p.type = "text";
    p.text = text;
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 1 - dt * 3;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.pool) {
      if (!p.active) continue;
      const progress = p.life / p.maxLife;
      const alpha = 1 - progress;
      ctx.globalAlpha = alpha;

      if (p.type === "dot") {
        ctx.fillStyle = p.color;
        const r = p.size * (1 - progress * 0.4);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3 * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + progress * 32, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.font = `bold ${p.size}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(p.text!, p.x, p.y);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
  }
}
