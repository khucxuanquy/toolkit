import type { Ball } from "../entities/Ball";
import { BALL_R } from "../entities/Ball";
import type { AimTrace } from "../systems/Aim";
import type { UIButton, Vec2 } from "../types";
import { TAU } from "../types";
import {
  PLAY_W,
  PLAY_H,
  RAIL,
  WORLD_W,
  WORLD_H,
  CUSHION,
  POCKETS,
  POCKET_VISUAL,
  HEAD_SPOT,
  FOOT_SPOT,
} from "../Table";

/**
 * Owns the canvas, DPR scaling and a "world" transform that maps logical play
 * coordinates to the canvas. Provides table/ball/cue/HUD drawing primitives.
 */
export class Renderer {
  readonly ctx: CanvasRenderingContext2D;
  width = 0; // css px
  height = 0;
  private dpr = 1;
  private scale = 1;
  private offsetX = 0;
  private offsetY = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
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
    this.scale = Math.min(w / WORLD_W, h / WORLD_H);
    this.offsetX = (w - WORLD_W * this.scale) / 2;
    this.offsetY = (h - WORLD_H * this.scale) / 2;
    return true;
  }

  /** Convert a canvas-css coordinate to logical play coordinates. */
  screenToPlay(cssX: number, cssY: number): Vec2 {
    return {
      x: (cssX - this.offsetX) / this.scale - RAIL,
      y: (cssY - this.offsetY) / this.scale - RAIL,
    };
  }

  setWorldTransform(): void {
    const s = this.dpr * this.scale;
    this.ctx.setTransform(s, 0, 0, s, this.dpr * this.offsetX, this.dpr * this.offsetY);
  }

  setScreenTransform(): void {
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  clear(): void {
    this.setScreenTransform();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  // ── Table ────────────────────────────────────────────────────────────────

  drawTable(): void {
    const ctx = this.ctx;
    this.setWorldTransform();

    // ── Outer wood frame ──
    const wood = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
    wood.addColorStop(0, "#6a4423");
    wood.addColorStop(0.5, "#4f3015");
    wood.addColorStop(1, "#38210f");
    ctx.fillStyle = wood;
    this.roundRectW(0, 0, WORLD_W, WORLD_H, 28);
    ctx.fill();
    // Wood top sheen + inner bevel.
    ctx.strokeStyle = "rgba(255,225,180,0.10)";
    ctx.lineWidth = 2;
    this.roundRectW(3, 3, WORLD_W - 6, WORLD_H - 6, 26);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 4;
    this.roundRectW(RAIL - 10, RAIL - 10, PLAY_W + 20, PLAY_H + 20, 14);
    ctx.stroke();

    // ── Felt ──
    const felt = ctx.createLinearGradient(RAIL, RAIL, RAIL, RAIL + PLAY_H);
    felt.addColorStop(0, "#1c8b52");
    felt.addColorStop(1, "#0e6238");
    ctx.fillStyle = felt;
    ctx.fillRect(RAIL, RAIL, PLAY_W, PLAY_H);

    // Soft cloth sheen (large radial) + edge vignette for depth.
    const sheen = ctx.createRadialGradient(
      RAIL + PLAY_W * 0.5, RAIL + PLAY_H * 0.38, PLAY_H * 0.1,
      RAIL + PLAY_W * 0.5, RAIL + PLAY_H * 0.5, PLAY_W * 0.66,
    );
    sheen.addColorStop(0, "rgba(255,255,255,0.07)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(0,0,0,0.34)");
    ctx.fillStyle = sheen;
    ctx.fillRect(RAIL, RAIL, PLAY_W, PLAY_H);

    // Head string + spots (under cushions).
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(RAIL + HEAD_SPOT.x, RAIL + 6);
    ctx.lineTo(RAIL + HEAD_SPOT.x, RAIL + PLAY_H - 6);
    ctx.stroke();
    this.spot(HEAD_SPOT);
    this.spot(FOOT_SPOT);

    this.drawCushions();
    this.drawPockets();
  }

  private spot(p: Vec2): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.arc(RAIL + p.x, RAIL + p.y, 3, 0, TAU);
    ctx.fill();
  }

  /** Beveled cushion bumpers with angled jaws at each pocket mouth. */
  private drawCushions(): void {
    const CW = CUSHION; // cushion depth into the felt
    const CORNER = 34; // mouth half-width at corner pockets
    const MID = 30; // mouth half-width at middle pockets
    const JAW = 13; // how far the nose pulls back toward the pocket
    const L = RAIL;
    const T = RAIL;
    const R = RAIL + PLAY_W;
    const B = RAIL + PLAY_H;
    const MX = RAIL + PLAY_W / 2;

    // Horizontal cushion (top/bottom). sign = +1 down (top rail), -1 up (bottom).
    const cushH = (x1: number, x2: number, yOuter: number, sign: number) => {
      const yIn = yOuter + sign * CW;
      const ctx = this.ctx;
      const g = ctx.createLinearGradient(0, yOuter, 0, yIn);
      g.addColorStop(0, "#0c5530");
      g.addColorStop(1, "#1aa05e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x1, yOuter);
      ctx.lineTo(x2, yOuter);
      ctx.lineTo(x2 - JAW, yIn);
      ctx.lineTo(x1 + JAW, yIn);
      ctx.closePath();
      ctx.fill();
      // bright nose edge
      ctx.strokeStyle = "rgba(180,255,210,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1 + JAW, yIn);
      ctx.lineTo(x2 - JAW, yIn);
      ctx.stroke();
    };

    // Vertical cushion (left/right). sign = +1 right (left rail), -1 left (right rail).
    const cushV = (y1: number, y2: number, xOuter: number, sign: number) => {
      const xIn = xOuter + sign * CW;
      const ctx = this.ctx;
      const g = ctx.createLinearGradient(xOuter, 0, xIn, 0);
      g.addColorStop(0, "#0c5530");
      g.addColorStop(1, "#1aa05e");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(xOuter, y1);
      ctx.lineTo(xOuter, y2);
      ctx.lineTo(xIn, y2 - JAW);
      ctx.lineTo(xIn, y1 + JAW);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(180,255,210,0.35)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(xIn, y1 + JAW);
      ctx.lineTo(xIn, y2 - JAW);
      ctx.stroke();
    };

    cushH(L + CORNER, MX - MID, T, 1); // top-left
    cushH(MX + MID, R - CORNER, T, 1); // top-right
    cushH(L + CORNER, MX - MID, B, -1); // bottom-left
    cushH(MX + MID, R - CORNER, B, -1); // bottom-right
    cushV(T + CORNER, B - CORNER, L, 1); // left
    cushV(T + CORNER, B - CORNER, R, -1); // right
  }

  /** Six pockets rendered as recessed holes with leather collar + brass rim. */
  private drawPockets(): void {
    for (const p of POCKETS) {
      const nx = p.pos.x === 0 ? -1 : p.pos.x === PLAY_W ? 1 : 0;
      const ny = p.pos.y <= 0 ? -1 : p.pos.y >= PLAY_H ? 1 : 0;
      const cx = RAIL + p.pos.x + nx * 7;
      const cy = RAIL + p.pos.y + ny * 7;
      this.drawPocket(cx, cy, p.corner ? POCKET_VISUAL + 3 : POCKET_VISUAL);
    }
  }

  private drawPocket(cx: number, cy: number, r: number): void {
    const ctx = this.ctx;
    // Leather collar.
    ctx.fillStyle = "#241910";
    ctx.beginPath();
    ctx.arc(cx, cy, r + 6, 0, TAU);
    ctx.fill();
    // Brass rim.
    ctx.strokeStyle = "rgba(206,168,86,0.6)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, TAU);
    ctx.stroke();
    // Recessed hole — radial gradient gives depth (lit near rim, black core).
    const g = ctx.createRadialGradient(cx, cy - r * 0.35, r * 0.15, cx, cy, r);
    g.addColorStop(0, "#000000");
    g.addColorStop(0.62, "#05070a");
    g.addColorStop(1, "#1b2230");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    // Inner shadow across the top (depth) + faint bottom rim highlight.
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.beginPath();
    ctx.arc(cx, cy, r - 2, Math.PI * 1.04, Math.PI * 1.96);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.beginPath();
    ctx.arc(cx, cy, r - 1, Math.PI * 0.1, Math.PI * 0.9);
    ctx.stroke();
  }

  // ── Balls ──────────────────────────────────────────────────────────────

  drawBalls(balls: Ball[]): void {
    const ctx = this.ctx;
    // Shadows first.
    for (const b of balls) {
      if (b.pocketed && !b.sinking) continue;
      const r = b.sinking ? BALL_R * (1 - b.sinkT) : BALL_R;
      if (r <= 0.5) continue;
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.beginPath();
      ctx.ellipse(RAIL + b.pos.x + 3, RAIL + b.pos.y + 4, r, r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const b of balls) {
      if (b.pocketed && !b.sinking) continue;
      this.drawBall(b);
    }
  }

  private drawBall(b: Ball): void {
    const ctx = this.ctx;
    const cx = RAIL + b.pos.x;
    const cy = RAIL + b.pos.y;
    const r = b.sinking ? BALL_R * (1 - b.sinkT) : BALL_R;
    if (r <= 0.5) return;
    const m = b.orient;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.clip();

    // Base colour.
    const base = b.isCue ? "#fbfbf2" : b.num === 8 ? "#161616" : b.isStripe ? "#f5f3ea" : b.color;
    ctx.fillStyle = base;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Rolling surface features (projected from the rotated orientation).
    if (b.isStripe) this.drawStripeBand(cx, cy, r, m, b.color);
    this.drawSurfaceMarks(cx, cy, r, m, b);

    // Sphere shading (fixed light) over the markings for a 3D look.
    const sh = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    sh.addColorStop(0, "rgba(255,255,255,0.4)");
    sh.addColorStop(0.45, "rgba(255,255,255,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = sh;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    // Specular highlight (fixed).
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.32, cy - r * 0.38, r * 0.26, r * 0.16, -Math.PI / 4, 0, TAU);
    ctx.fill();
    ctx.restore();

    // Outline.
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }

  /** Project the rotated equator great circle as the stripe band. */
  private drawStripeBand(cx: number, cy: number, r: number, m: number[], color: string): void {
    const ctx = this.ctx;
    ctx.lineWidth = r * 0.62;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const N = 48;
    let started = false;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) {
      const f = (i / N) * TAU;
      const cf = Math.cos(f);
      const sf = Math.sin(f);
      const wz = m[6] * cf + m[7] * sf; // toward viewer if > 0
      if (wz > 0) {
        const wx = m[0] * cf + m[1] * sf;
        const wy = m[3] * cf + m[4] * sf;
        const x = cx + wx * r;
        const y = cy + wy * r;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      } else if (started) {
        ctx.stroke();
        ctx.beginPath();
        started = false;
      }
    }
    if (started) ctx.stroke();
  }

  /** Number patches on the poles (cue ball → measle-style spots). */
  private drawSurfaceMarks(cx: number, cy: number, r: number, m: number[], b: Ball): void {
    const ctx = this.ctx;
    if (b.isCue) {
      const axes: [number, number, number][] = [
        [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
      ];
      for (const [lx, ly, lz] of axes) {
        const wz = m[6] * lx + m[7] * ly + m[8] * lz;
        if (wz <= 0.06) continue;
        const wx = m[0] * lx + m[1] * ly + m[2] * lz;
        const wy = m[3] * lx + m[4] * ly + m[5] * lz;
        ctx.fillStyle = "#d4452f";
        ctx.beginPath();
        ctx.arc(cx + wx * r, cy + wy * r, r * 0.13 * (0.5 + 0.5 * wz), 0, TAU);
        ctx.fill();
      }
      return;
    }
    // Two opposite poles carry the number on a white circle.
    this.pole(cx, cy, r, m[2], m[5], m[8], b.num);
    this.pole(cx, cy, r, -m[2], -m[5], -m[8], b.num);
  }

  private pole(cx: number, cy: number, r: number, wx: number, wy: number, wz: number, num: number): void {
    if (wz <= 0.02) return;
    const ctx = this.ctx;
    const x = cx + wx * r;
    const y = cy + wy * r;
    const pr = r * 0.5 * (0.4 + 0.6 * wz);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, pr, 0, TAU);
    ctx.fill();
    if (wz > 0.45 && pr > 4) {
      ctx.fillStyle = "#1a1a1a";
      ctx.font = `bold ${Math.round(pr * 1.05)}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(num), x, y + 0.5);
    }
  }

  // ── Aim + cue ───────────────────────────────────────────────────────────

  drawAim(trace: AimTrace, ballOnHighlight: number | null, balls: Ball[]): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 9]);
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    const s0 = trace.segments[0];
    ctx.moveTo(RAIL + s0.x, RAIL + s0.y);
    for (let i = 1; i < trace.segments.length; i++) {
      ctx.lineTo(RAIL + trace.segments[i].x, RAIL + trace.segments[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    if (trace.ghost) {
      // Ghost ball at contact.
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(RAIL + trace.ghost.x, RAIL + trace.ghost.y, BALL_R, 0, Math.PI * 2);
      ctx.stroke();
      // Predicted target direction.
      if (trace.targetDir && trace.targetBall) {
        const t = trace.targetBall.pos;
        ctx.strokeStyle = "rgba(255,235,120,0.9)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(RAIL + t.x, RAIL + t.y);
        ctx.lineTo(RAIL + t.x + trace.targetDir.x * 90, RAIL + t.y + trace.targetDir.y * 90);
        ctx.stroke();
      }
    }
    ctx.restore();

    // Highlight the legal "ball on" (9-ball lowest / 8 when on it).
    if (ballOnHighlight !== null) {
      const tb = balls.find((b) => b.num === ballOnHighlight && !b.pocketed);
      if (tb) {
        ctx.strokeStyle = "rgba(120,220,255,0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(RAIL + tb.pos.x, RAIL + tb.pos.y, BALL_R + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  drawCueStick(cuePos: Vec2, angle: number, power: number, recoil: number): void {
    const ctx = this.ctx;
    const cx = RAIL + cuePos.x;
    const cy = RAIL + cuePos.y;
    // The stick sits behind the ball (opposite travel direction).
    const back = { x: -Math.cos(angle), y: -Math.sin(angle) };
    const gap = 16 + power * 70 - recoil * 60;
    const len = 230;
    const tipX = cx + back.x * gap;
    const tipY = cy + back.y * gap;
    const buttX = cx + back.x * (gap + len);
    const buttY = cy + back.y * (gap + len);

    ctx.save();
    ctx.lineCap = "round";
    // Shaft
    const grad = ctx.createLinearGradient(tipX, tipY, buttX, buttY);
    grad.addColorStop(0, "#f3e0b8");
    grad.addColorStop(0.7, "#c79a5b");
    grad.addColorStop(1, "#6b3f1d");
    ctx.strokeStyle = grad;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(buttX, buttY);
    ctx.stroke();
    // Tip
    ctx.strokeStyle = "#2b6cb0";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + back.x * 6, tipY + back.y * 6);
    ctx.stroke();
    ctx.restore();
  }

  // ── HUD primitives (screen space) ─────────────────────────────────────────

  drawButton(b: UIButton, accent = false): void {
    const ctx = this.ctx;
    ctx.fillStyle = b.active || accent ? "rgba(99,102,241,0.92)" : "rgba(15,23,42,0.62)";
    this.roundRect(b.x, b.y, b.w, b.h, 9);
    ctx.fill();
    if (b.active) {
      ctx.strokeStyle = "rgba(165,180,252,0.7)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = "#fff";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 0.5);
  }

  panel(x: number, y: number, w: number, h: number, alpha = 0.6): void {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(15,23,42,${alpha})`;
    this.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  text(s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = "left"): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    ctx.fillText(s, x, y);
  }

  /** Small cue-ball spin selector. Returns its geometry for hit-testing. */
  drawSpinPuck(x: number, y: number, r: number, spinX: number, spinY: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(251,251,242,0.95)";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
    // cross-hair
    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.moveTo(x, y - r);
    ctx.lineTo(x, y + r);
    ctx.stroke();
    // spin dot
    ctx.fillStyle = "#dc2626";
    ctx.beginPath();
    ctx.arc(x + spinX * r * 0.7, y - spinY * r * 0.7, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPowerMeter(x: number, y: number, w: number, h: number, power: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(15,23,42,0.6)";
    this.roundRect(x, y, w, h, 6);
    ctx.fill();
    const fillH = h * power;
    const hue = 120 - power * 120;
    ctx.fillStyle = `hsl(${hue},85%,55%)`;
    this.roundRect(x, y + (h - fillH), w, fillH, 6);
    ctx.fill();
  }

  /** A small ball glyph for HUD (screen space). */
  drawBallGlyph(num: number, x: number, y: number, r: number, color: string, stripe: boolean): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    if (stripe) {
      ctx.fillStyle = "#f5f3ea";
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = color;
      ctx.fillRect(x - r, y - r * 0.5, r * 2, r);
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  dim(alpha = 0.6): void {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(8,12,24,${alpha})`;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  private roundRectW(x: number, y: number, w: number, h: number, r: number): void {
    this.roundRect(x, y, w, h, r);
  }
}
