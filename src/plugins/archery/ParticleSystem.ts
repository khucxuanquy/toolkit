import type { Vec2 } from "./types";

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
}

interface Pulse {
  active: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FloatingText {
  active: boolean;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

/**
 * Pooled particle system. Burst particles are drawn from a fixed pool (no
 * per-frame allocation); pulses, flashes and floating score texts use small
 * managed arrays. Wind/ambient particles reuse the same pool.
 */
export class ParticleSystem {
  private pool: Particle[] = [];
  private pulses: Pulse[] = [];
  private texts: FloatingText[] = [];

  constructor(poolSize = 300) {
    for (let i = 0; i < poolSize; i++) {
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
        gravity: 0,
      });
    }
  }

  private acquire(): Particle | null {
    for (const p of this.pool) if (!p.active) return p;
    return null; // pool exhausted — drop the request rather than allocate
  }

  spawnBurst(at: Vec2, color: string, count = 16, speed = 240): void {
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) return;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.3 + Math.random() * 0.7);
      p.active = true;
      p.x = at.x;
      p.y = at.y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.life = 0;
      p.maxLife = 0.4 + Math.random() * 0.4;
      p.size = 1.5 + Math.random() * 2.5;
      p.color = color;
      p.gravity = 480;
    }
  }

  /** A drifting ambient particle carried by the wind. */
  spawnWind(width: number, height: number, wind: number): void {
    const p = this.acquire();
    if (!p) return;
    p.active = true;
    p.x = wind >= 0 ? -10 : width + 10;
    p.y = Math.random() * height * 0.7;
    p.vx = wind * (60 + Math.random() * 80) + (wind >= 0 ? 30 : -30);
    p.vy = (Math.random() - 0.5) * 10;
    p.life = 0;
    p.maxLife = 2.5;
    p.size = 1 + Math.random() * 1.5;
    p.color = "rgba(255,255,255,0.5)";
    p.gravity = 0;
  }

  spawnPulse(at: Vec2, maxR: number, color: string): void {
    this.pulses.push({ active: true, x: at.x, y: at.y, r: 0, maxR, life: 0, maxLife: 0.6, color });
  }

  spawnFlash(at: Vec2): void {
    this.pulses.push({ active: true, x: at.x, y: at.y, r: 0, maxR: 80, life: 0, maxLife: 0.35, color: "rgba(255,255,255,X)" });
  }

  spawnText(at: Vec2, text: string, color: string): void {
    this.texts.push({ active: true, x: at.x, y: at.y, text, life: 0, maxLife: 1.1, color });
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (const pu of this.pulses) {
      pu.life += dt;
      if (pu.life >= pu.maxLife) pu.active = false;
      else pu.r = pu.maxR * (pu.life / pu.maxLife);
    }
    for (const tx of this.texts) {
      tx.life += dt;
      if (tx.life >= tx.maxLife) tx.active = false;
      else tx.y -= 40 * dt;
    }
    // Compact the small managed arrays occasionally.
    if (this.pulses.length > 64) this.pulses = this.pulses.filter((p) => p.active);
    if (this.texts.length > 32) this.texts = this.texts.filter((t) => t.active);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Burst / wind particles.
    for (const p of this.pool) {
      if (!p.active) continue;
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pulses / flashes.
    for (const pu of this.pulses) {
      if (!pu.active) continue;
      const a = 1 - pu.life / pu.maxLife;
      if (pu.color.includes("X")) {
        ctx.fillStyle = pu.color.replace("X", String(a * 0.8));
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = pu.color;
        ctx.globalAlpha = a;
        ctx.lineWidth = 3 * a + 1;
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, pu.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Floating score texts.
    ctx.textAlign = "center";
    ctx.font = "bold 26px system-ui, sans-serif";
    for (const tx of this.texts) {
      if (!tx.active) continue;
      const a = 1 - tx.life / tx.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = tx.color;
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 3;
      ctx.strokeText(tx.text, tx.x, tx.y);
      ctx.fillText(tx.text, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;
  }

  clear(): void {
    for (const p of this.pool) p.active = false;
    this.pulses = [];
    this.texts = [];
  }
}
