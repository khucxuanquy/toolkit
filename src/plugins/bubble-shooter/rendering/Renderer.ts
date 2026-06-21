import type { Bubble } from "../entities/Bubble";
import { BUBBLE_RADIUS } from "../entities/Bubble";
import type { GridSystem } from "../systems/GridSystem";
import { COLS_EVEN } from "../systems/GridSystem";
import type { BubbleColor, BubbleType, BubbleStrings, GameMode, GameStatus, Vec2 } from "../types";
import { COLOR_FILL, COLOR_LIGHT, DEFAULT_BUBBLE_STRINGS, fmt } from "../types";

export interface RenderState {
  mode: GameMode;
  status: GameStatus;
  score: number;
  bestScore: number;
  movesUsed: number;
  bubblesLeft: number;
  timeLeft: number;
  combo: number;
  currentBubble: { color: BubbleColor; type: BubbleType } | null;
  nextBubble: { color: BubbleColor; type: BubbleType } | null;
  shooterX: number;
  shooterY: number;
  aimAngle: number;
  isAiming: boolean;
  flyingBubble: Bubble | null;
  grid: GridSystem;
  dropping: Bubble[];
  ceilingY: number;
  leftWall: number;
  rightWall: number;
  muted: boolean;
  dangerY: number;
}

export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  strings: BubbleStrings = DEFAULT_BUBBLE_STRINGS;
  private dpr = 1;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D context unavailable");
    this.ctx = ctx;
    this.resize();
  }

  resize(): boolean {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (w === this.width && h === this.height && dpr === this.dpr) return false;
    this.width = w;
    this.height = h;
    this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  drawBackground(ceilingY: number, dangerY: number): void {
    const ctx = this.ctx;
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, "#1e1b4b");
    sky.addColorStop(0.5, "#312e81");
    sky.addColorStop(1, "#1e3a5f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle grid lines for depth
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;
    for (let y = ceilingY; y < dangerY; y += 44) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Danger zone tint
    const dangerGrad = ctx.createLinearGradient(0, dangerY - 30, 0, this.height);
    dangerGrad.addColorStop(0, "rgba(239,68,68,0)");
    dangerGrad.addColorStop(1, "rgba(239,68,68,0.18)");
    ctx.fillStyle = dangerGrad;
    ctx.fillRect(0, dangerY - 30, this.width, this.height - dangerY + 30);

    // Danger line
    ctx.strokeStyle = "rgba(239,68,68,0.4)";
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(this.width, dangerY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawGrid(grid: GridSystem): void {
    grid.forEach((b, _row, _col) => {
      if (b.popping || b.dropping) return; // handled separately
      this.drawBubble(this.ctx, b.pos.x, b.pos.y, b.fillColor, b.lightColor, b.type, b.color, b.attachScale);
    });
  }

  drawDropping(dropping: Bubble[]): void {
    for (const b of dropping) {
      if (!b.active) continue;
      this.drawBubble(this.ctx, b.pos.x, b.pos.y, b.fillColor, b.lightColor, b.type, b.color, 1, b.popAlpha);
    }
  }

  drawPopping(grid: GridSystem): void {
    grid.forEach((b) => {
      if (!b.popping) return;
      this.drawBubble(this.ctx, b.pos.x, b.pos.y, b.fillColor, b.lightColor, b.type, b.color, b.popScale, b.popAlpha);
    });
  }

  drawFlyingBubble(fly: Bubble): void {
    this.drawBubble(this.ctx, fly.pos.x, fly.pos.y, fly.fillColor, fly.lightColor, fly.type, fly.color, 1);
  }

  drawShooter(x: number, y: number, current: { color: BubbleColor; type: BubbleType } | null, next: { color: BubbleColor; type: BubbleType } | null, aimAngle: number): void {
    const ctx = this.ctx;
    const R = BUBBLE_RADIUS;

    // Launcher body
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(aimAngle + Math.PI / 2);
    // Barrel
    const barrelGrad = ctx.createLinearGradient(-6, -50, 6, -50);
    barrelGrad.addColorStop(0, "#475569");
    barrelGrad.addColorStop(0.5, "#94a3b8");
    barrelGrad.addColorStop(1, "#475569");
    ctx.fillStyle = barrelGrad;
    ctx.beginPath();
    ctx.roundRect(-6, -54, 12, 38, 4);
    ctx.fill();
    ctx.restore();

    // Base circle
    const baseGrad = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, 22);
    baseGrad.addColorStop(0, "#64748b");
    baseGrad.addColorStop(1, "#1e293b");
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current bubble inside launcher
    if (current) {
      const fc = current.type !== "normal" ? COLOR_FILL[current.type] : COLOR_FILL[current.color];
      const lc = current.type !== "normal" ? COLOR_LIGHT[current.type] : COLOR_LIGHT[current.color];
      this.drawBubble(ctx, x, y, fc, lc, current.type, current.color, 0.85);
    }

    // Next bubble preview
    if (next) {
      const nx = x + R * 2.8;
      const ny = y;
      const fc = next.type !== "normal" ? COLOR_FILL[next.type] : COLOR_FILL[next.color];
      const lc = next.type !== "normal" ? COLOR_LIGHT[next.type] : COLOR_LIGHT[next.color];
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(nx, ny, R + 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.stroke();
      this.drawBubble(ctx, nx, ny, fc, lc, next.type, next.color, 0.7);
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "bold 9px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.strings.next, nx, ny + R + 10);
    }
  }

  drawAimGuide(shooterX: number, shooterY: number, aimAngle: number, leftWall: number, rightWall: number, ceilingY: number): void {
    const ctx = this.ctx;
    const R = BUBBLE_RADIUS;

    // Only show guide when aiming upward
    const dy = Math.sin(aimAngle);
    if (dy >= -0.05) return;

    let x = shooterX;
    let y = shooterY - 28; // start from barrel tip
    let vx = Math.cos(aimAngle);
    let vy = Math.sin(aimAngle);

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.lineCap = "round";

    for (let bounce = 0; bounce < 4; bounce++) {
      // Find next intersection: left wall, right wall, or ceiling
      const tLeft = vx < 0 ? (leftWall + R - x) / vx : Infinity;
      const tRight = vx > 0 ? (rightWall - R - x) / vx : Infinity;
      const tCeil = vy < 0 ? (ceilingY + R - y) / vy : Infinity;
      const tWall = Math.min(tLeft, tRight);
      const t = Math.min(tWall, tCeil);

      const ex = x + vx * t;
      const ey = y + vy * t;

      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      if (tCeil <= tWall) {
        // Show ghost bubble at landing zone
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(ex, ey, R, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }

      // Wall bounce
      x = ex; y = ey;
      vx = -vx;

      // Small bounce indicator
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.setLineDash([8, 10]);
    }

    ctx.restore();
  }

  drawHUD(s: RenderState): void {
    const ctx = this.ctx;

    // Score panel (top-left)
    this.panel(ctx, 10, 8, 130, 52);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`★ ${s.score}`, 20, 24);
    ctx.fillStyle = "rgba(148,163,184,0.8)";
    ctx.font = "11px system-ui";
    ctx.fillText(`${this.strings.best} ${s.bestScore}`, 20, 45);

    // Mode / moves / time (top-right)
    const rightX = this.width - 10;
    this.panel(ctx, rightX - 130, 8, 130, 52);
    ctx.textAlign = "right";
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 14px system-ui";
    const modeLine = s.mode === "timed"
      ? `⏱ ${Math.ceil(s.timeLeft)}s`
      : s.mode === "level"
        ? `🎯 ${s.bubblesLeft} ${this.strings.left}`
        : `🏹 ${s.movesUsed}`;
    ctx.fillText(modeLine, rightX - 14, 24);
    ctx.fillStyle = "rgba(148,163,184,0.8)";
    ctx.font = "11px system-ui";
    const modeLabel = {
      classic: this.strings.classic,
      level: this.strings.level,
      timed: this.strings.timed,
      survival: this.strings.survival,
    }[s.mode];
    ctx.fillText(modeLabel, rightX - 14, 45);

    // Combo indicator (center-top)
    if (s.combo >= 2) {
      const cx = this.width / 2;
      ctx.textAlign = "center";
      ctx.font = `bold ${14 + s.combo * 2}px system-ui`;
      const comboColors = ["#f59e0b", "#f97316", "#ef4444", "#a855f7"];
      ctx.fillStyle = comboColors[Math.min(s.combo - 2, 3)];
      ctx.fillText(fmt(this.strings.combo, { n: s.combo }), cx, 28);
    }
  }

  drawGameOver(score: number, bestScore: number, isWin: boolean): void {
    const ctx = this.ctx;
    const cx = this.width / 2;
    const cy = this.height / 2;

    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillRect(0, 0, this.width, this.height);

    const panelW = 280;
    const panelH = 180;
    ctx.fillStyle = "rgba(30,27,75,0.95)";
    this.roundRect(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = isWin ? "#22c55e" : "#ef4444";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = isWin ? "#22c55e" : "#ef4444";
    ctx.font = "bold 28px system-ui";
    ctx.fillText(isWin ? this.strings.youWin : this.strings.gameOver, cx, cy - 50);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 42px system-ui";
    ctx.fillText(String(score), cx, cy);

    ctx.fillStyle = "rgba(148,163,184,0.8)";
    ctx.font = "13px system-ui";
    ctx.fillText(fmt(this.strings.bestColon, { n: bestScore }), cx, cy + 38);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "12px system-ui";
    ctx.fillText(this.strings.tapPlayAgain, cx, cy + 68);
  }

  drawPausedOverlay(): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 32px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.strings.paused, this.width / 2, this.height / 2);
    ctx.font = "14px system-ui";
    ctx.fillStyle = "rgba(148,163,184,0.8)";
    ctx.fillText(this.strings.tapResume, this.width / 2, this.height / 2 + 40);
  }

  drawModeButtons(buttons: { label: string; x: number; y: number; w: number; h: number; active: boolean }[]): void {
    const ctx = this.ctx;
    for (const b of buttons) {
      ctx.fillStyle = b.active ? "rgba(99,102,241,0.85)" : "rgba(15,23,42,0.55)";
      this.roundRect(ctx, b.x, b.y, b.w, b.h, 8);
      ctx.fill();
      if (b.active) {
        ctx.strokeStyle = "rgba(129,140,248,0.6)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 11px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
    }
  }

  /** Draw a single bubble with shiny finish. */
  drawBubble(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    fillColor: string,
    lightColor: string,
    type: BubbleType,
    color: BubbleColor,
    scale = 1,
    alpha = 1,
  ): void {
    const R = BUBBLE_RADIUS * scale;
    if (R <= 0 || alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = alpha;

    // Shadow
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 8;

    // Main fill
    const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.05, cx, cy, R);
    grad.addColorStop(0, lightColor);
    grad.addColorStop(0.6, fillColor);
    grad.addColorStop(1, this.darken(fillColor, 0.5));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Border
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shine highlight
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(cx - R * 0.25, cy - R * 0.3, R * 0.35, R * 0.22, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Special type icon
    ctx.shadowBlur = 0;
    ctx.fillStyle = type === "stone" ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.7)";
    ctx.font = `bold ${Math.round(R * 0.85)}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (type === "bomb") ctx.fillText("💣", cx, cy + 1);
    else if (type === "rainbow") {
      // Rainbow gradient fill override
      ctx.restore();
      ctx.save();
      ctx.globalAlpha = alpha;
      const rg = ctx.createLinearGradient(cx - R, cy, cx + R, cy);
      rg.addColorStop(0, "#ef4444");
      rg.addColorStop(0.2, "#f97316");
      rg.addColorStop(0.4, "#eab308");
      rg.addColorStop(0.6, "#22c55e");
      rg.addColorStop(0.8, "#3b82f6");
      rg.addColorStop(1, "#a855f7");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.beginPath();
      ctx.ellipse(cx - R * 0.25, cy - R * 0.3, R * 0.35, R * 0.22, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.font = `bold ${Math.round(R * 0.85)}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🌈", cx, cy + 1);
    } else if (type === "stone") {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = `bold ${Math.round(R * 0.85)}px system-ui`;
      ctx.fillText("🪨", cx, cy + 1);
    } else if (type === "lightning") {
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.font = `bold ${Math.round(R * 0.85)}px system-ui`;
      ctx.fillText("⚡", cx, cy + 1);
    }

    ctx.restore();
  }

  private panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    ctx.fillStyle = "rgba(15,23,42,0.65)";
    this.roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private darken(hex: string, factor: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round(((n >> 16) & 0xff) * factor);
    const g = Math.round(((n >> 8) & 0xff) * factor);
    const b = Math.round((n & 0xff) * factor);
    return `rgb(${r},${g},${b})`;
  }
}
