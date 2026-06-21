import type { ArcheryStrings, GameMode, UIButton } from "./types";
import { DEFAULT_ARCHERY_STRINGS } from "./types";

interface Cloud {
  x: number;
  y: number;
  scale: number;
  speed: number;
}

export interface HUDState {
  mode: GameMode;
  score: number;
  lastScore: number | null;
  arrowsLeft: number | null; // null outside challenge
  wind: number; // -1..1
  muted: boolean;
  drawing: boolean;
  power: number; // 0..1
  buttons: UIButton[];
  gameOver: boolean;
  finalScore: number;
}

/**
 * Owns the canvas, device-pixel-ratio scaling and all environment + HUD
 * drawing. Entities (bow, arrows, target, particles) draw themselves with the
 * context exposed here.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  groundY = 0;
  strings: ArcheryStrings = DEFAULT_ARCHERY_STRINGS;
  private dpr = 1;
  private clouds: Cloud[] = [];

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;
    this.resize();
    this.initClouds();
  }

  private initClouds(): void {
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      this.clouds.push({
        x: Math.random() * this.width,
        y: 30 + Math.random() * (this.height * 0.3),
        scale: 0.6 + Math.random() * 0.8,
        speed: 6 + Math.random() * 10,
      });
    }
  }

  /** Match the backing store to the element size & DPR. Returns true if changed. */
  resize(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && dpr === this.dpr) return false;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.groundY = h * 0.82;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.clouds.length === 0) this.initClouds();
    return true;
  }

  update(dt: number): void {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x - 80 * c.scale > this.width) c.x = -80 * c.scale;
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(): void {
    const ctx = this.ctx;
    // Sky.
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, "#7dd3fc");
    sky.addColorStop(1, "#dbeafe");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.groundY);

    // Clouds.
    for (const c of this.clouds) this.drawCloud(c);

    // Ground.
    const g = ctx.createLinearGradient(0, this.groundY, 0, this.height);
    g.addColorStop(0, "#86efac");
    g.addColorStop(1, "#4d7c0f");
    ctx.fillStyle = g;
    ctx.fillRect(0, this.groundY, this.width, this.height - this.groundY);
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, this.groundY, this.width, 3);
  }

  private drawCloud(c: Cloud): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#ffffff";
    const s = c.scale;
    for (const [dx, dy, r] of [
      [0, 0, 22],
      [22, 4, 18],
      [-22, 6, 16],
      [6, -10, 16],
    ] as const) {
      ctx.beginPath();
      ctx.arc(c.x + dx * s, c.y + dy * s, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private button(b: UIButton): void {
    const ctx = this.ctx;
    ctx.fillStyle = b.active ? "rgba(99,102,241,0.92)" : "rgba(15,23,42,0.55)";
    this.roundRect(b.x, b.y, b.w, b.h, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawHUD(s: HUDState): void {
    const ctx = this.ctx;
    ctx.textBaseline = "middle";

    // Buttons (modes, mute).
    for (const b of s.buttons) this.button(b);

    // Score / arrows readout.
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(15,23,42,0.85)";
    ctx.font = "700 20px system-ui, sans-serif";
    const scoreLabel =
      s.arrowsLeft !== null ? `${s.score}` : `${s.score}`;
    ctx.fillText(`★ ${scoreLabel}`, 14, 58);
    if (s.arrowsLeft !== null) {
      ctx.font = "600 14px system-ui, sans-serif";
      ctx.fillStyle = "rgba(15,23,42,0.7)";
      ctx.fillText(`🏹 ${s.arrowsLeft}`, 14, 82);
    }

    // Wind indicator (top-right).
    this.drawWind(s.wind);

    // Power meter while drawing.
    if (s.drawing) this.drawPower(s.power);

    // Challenge game-over overlay.
    if (s.gameOver) this.drawGameOver(s.finalScore);
  }

  private drawWind(wind: number): void {
    const ctx = this.ctx;
    const boxW = 128;
    const boxX = this.width - boxW - 12;
    const cy = 27;
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    this.roundRect(boxX, cy - 15, boxW, 30, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(this.strings.wind, boxX + 12, cy);
    // Arrow showing direction & strength.
    const dir = wind >= 0 ? 1 : -1;
    const mag = Math.min(1, Math.abs(wind));
    const ax = boxX + 68;
    const len = 8 + mag * 24;
    ctx.strokeStyle = mag > 0.6 ? "#ef4444" : "#fde047";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, cy);
    ctx.lineTo(ax + dir * len, cy);
    ctx.lineTo(ax + dir * (len - 6), cy - 4);
    ctx.moveTo(ax + dir * len, cy);
    ctx.lineTo(ax + dir * (len - 6), cy + 4);
    ctx.stroke();
  }

  private drawPower(power: number): void {
    const ctx = this.ctx;
    const w = 140;
    const h = 12;
    const x = this.width / 2 - w / 2;
    const y = this.height - 28;
    ctx.fillStyle = "rgba(15,23,42,0.5)";
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    const hue = 120 - power * 120; // green → red
    ctx.fillStyle = `hsl(${hue},80%,55%)`;
    this.roundRect(x, y, w * power, h, 6);
    ctx.fill();
  }

  private drawGameOver(finalScore: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "800 34px system-ui, sans-serif";
    ctx.fillText(this.strings.finalScore, this.width / 2, this.height / 2 - 36);
    ctx.font = "800 64px system-ui, sans-serif";
    ctx.fillStyle = "#fde047";
    ctx.fillText(String(finalScore), this.width / 2, this.height / 2 + 18);
    ctx.font = "600 16px system-ui, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(this.strings.playAgain, this.width / 2, this.height / 2 + 60);
  }
}
