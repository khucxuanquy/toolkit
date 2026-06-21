import type { ArcheryStrings, GameMode, GamePlugin, UIButton, Vec2 } from "./types";
import { DEFAULT_ARCHERY_STRINGS } from "./types";
import { Renderer, type HUDState } from "./Renderer";
import { Bow, ARROW_LEN } from "./Bow";
import { Arrow } from "./Arrow";
import { Target } from "./Target";
import { ParticleSystem } from "./ParticleSystem";
import { SoundManager } from "./SoundManager";
import { DEFAULT_PHYSICS, dist, length, type PhysicsConfig } from "./Physics";

const MIN_SPEED = 540;
const MAX_SPEED = 1480;
// Above this speed at closest approach, the arrow is too fast to catch in the
// target face: it punches over/through the top and sails past (a miss). This
// stops the "draw to full power → guaranteed 10" exploit — you must control
// power so the arrow slows near its apex to score.
const EMBED_MAX_SPEED = 820;
const WIND_ACCEL = 150; // px/s² at |wind| = 1
const MAX_PULL_FRAC = 0.26; // of canvas width
const ARROW_POOL = 16;
const CHALLENGE_ARROWS = 10;

/**
 * Full archery game. Implements the framework-agnostic {@link GamePlugin}
 * contract and renders everything to one canvas. Handles input (mouse + touch),
 * the draw/aim/release loop, ballistics, scoring, the three game modes, and
 * complete teardown.
 */
export class ArcheryGame implements GamePlugin {
  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: Renderer | null = null;

  private readonly bow = new Bow();
  private readonly target = new Target();
  private readonly particles = new ParticleSystem();
  private readonly sound = new SoundManager();
  private readonly physics: PhysicsConfig = { ...DEFAULT_PHYSICS };
  private readonly arrows: Arrow[] = [];
  private strings: ArcheryStrings = DEFAULT_ARCHERY_STRINGS;

  private mode: GameMode = "practice";
  private score = 0;
  private lastScore: number | null = null;
  private arrowsLeft = CHALLENGE_ARROWS;
  private gameOver = false;
  private wind = 0;

  private pointer: Vec2 = { x: 0, y: 0 };
  private buttons: UIButton[] = [];
  private windTimer = 0;

  private raf = 0;
  private last = 0;
  private running = false;

  // Bound handlers (kept for removal in destroy()).
  private onDown = (e: PointerEvent) => this.handleDown(e);
  private onMove = (e: PointerEvent) => this.handleMove(e);
  private onUp = (e: PointerEvent) => this.handleUp(e);
  private onResize = () => this.renderer?.resize();
  private onContext = (e: Event) => e.preventDefault();
  private onVisibility = () => {
    if (document.hidden) this.pause();
    else if (this.container) this.resume();
  };
  private resizeObserver: ResizeObserver | null = null;

  // ── GamePlugin lifecycle ──────────────────────────────────────────────────

  init(container: HTMLElement): void {
    this.container = container;
    const canvas = document.createElement("canvas");
    canvas.style.display = "block";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.touchAction = "none";
    canvas.style.cursor = "crosshair";
    container.appendChild(canvas);
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.renderer.strings = this.strings;

    for (let i = 0; i < ARROW_POOL; i++) this.arrows.push(new Arrow());

    this.bow.aim = -Math.PI / 2; // resting bow points upward
    this.rollWind();
    this.setMode("practice");

    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("contextmenu", this.onContext);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.renderer?.resize());
    this.resizeObserver.observe(canvas);
  }

  /** Inject localized UI strings (safe to call any time). */
  setStrings(s: ArcheryStrings): void {
    this.strings = s;
    if (this.renderer) this.renderer.strings = s;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  pause(): void {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.sound.stop("arrow_fly");
  }

  resume(): void {
    if (this.running || !this.renderer) return;
    this.start();
  }

  destroy(): void {
    this.pause();
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener("pointerdown", this.onDown);
      canvas.removeEventListener("pointermove", this.onMove);
      canvas.removeEventListener("pointercancel", this.onUp);
      canvas.removeEventListener("contextmenu", this.onContext);
    }
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.sound.dispose();
    this.particles.clear();
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    this.canvas = null;
    this.renderer = null;
    this.container = null;
  }

  // ── Core loop ─────────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const r = this.renderer;
    if (!r) return;
    r.resize();
    r.update(dt);
    this.layout();
    this.target.update(dt);
    // Embedded arrows ride along with the (possibly moving) target.
    for (const a of this.arrows) if (a.stuck && a.attached) a.followTarget(this.target.center);
    this.particles.update(dt);

    // Ambient wind particles, scaled by wind strength.
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer = 0.05 + (1 - Math.min(1, Math.abs(this.wind))) * 0.25;
      if (Math.abs(this.wind) > 0.05) this.particles.spawnWind(r.width, r.height, this.wind);
    }

    for (const a of this.arrows) {
      if (!a.active || a.stuck) continue;
      a.update(this.physics, dt);
      this.collide(a);
    }

    // Challenge end condition: out of arrows and nothing in flight.
    if (this.mode === "challenge" && this.arrowsLeft <= 0 && !this.anyFlying()) {
      this.gameOver = true;
    }
  }

  private render(): void {
    const r = this.renderer;
    if (!r) return;
    const ctx = r.ctx;
    r.clear();
    r.drawBackground();
    this.target.draw(ctx);
    for (const a of this.arrows) a.draw(ctx);
    if (!this.gameOver) {
      this.drawAimGuide(ctx);
      this.bow.draw(ctx);
    }
    this.particles.draw(ctx);
    r.drawHUD(this.hudState());
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  private layout(): void {
    const r = this.renderer;
    if (!r) return;
    const { width, height } = r;
    // Bow at bottom-centre, target at top-centre → shoot upward.
    this.bow.setAnchor({ x: width * 0.5, y: height * 0.8 });
    const tx = width * 0.5;
    const ty = height * 0.27;
    const radius = Math.max(46, Math.min(width, height) * 0.13);
    this.target.setLayout(tx, ty, radius, width);

    // Buttons: mute (top-left) + three mode buttons (second row).
    const muted = this.sound.isMuted;
    const gap = 8;
    const rowW = width - 24;
    const each = (rowW - gap * 2) / 3;
    const y2 = 50;
    const modeBtn = (key: GameMode, label: string, i: number): UIButton => ({
      key,
      label,
      x: 12 + i * (each + gap),
      y: y2,
      w: each,
      h: 30,
      active: this.mode === key,
    });
    this.buttons = [
      { key: "mute", label: muted ? "🔇" : "🔊", x: 12, y: 12, w: 40, h: 30 },
      modeBtn("practice", this.strings.practice, 0),
      modeBtn("moving", this.strings.moving, 1),
      modeBtn("challenge", this.strings.challenge, 2),
    ];
  }

  private hudState(): HUDState {
    return {
      mode: this.mode,
      score: this.score,
      lastScore: this.lastScore,
      arrowsLeft: this.mode === "challenge" ? this.arrowsLeft : null,
      wind: this.wind,
      muted: this.sound.isMuted,
      drawing: this.bow.drawing,
      power: this.bow.power,
      buttons: this.buttons,
      gameOver: this.gameOver,
      finalScore: this.score,
    };
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private posOf(e: PointerEvent): Vec2 {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private hitButton(p: Vec2): UIButton | null {
    for (const b of this.buttons) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }

  private handleDown(e: PointerEvent): void {
    e.preventDefault();
    this.sound.resume();
    const p = this.posOf(e);
    this.pointer = p;

    const btn = this.hitButton(p);
    if (btn) {
      if (btn.key === "mute") this.sound.isMuted ? this.sound.unmute() : this.sound.mute();
      else this.setMode(btn.key as GameMode);
      return;
    }
    if (this.gameOver) return;

    try {
      this.canvas?.setPointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released */
    }
    this.bow.drawing = true;
    this.bow.setDraw(p, this.maxPull());
    this.sound.play("draw");
  }

  private handleMove(e: PointerEvent): void {
    const p = this.posOf(e);
    this.pointer = p;
    if (this.bow.drawing) this.bow.setDraw(p, this.maxPull());
  }

  private handleUp(e: PointerEvent): void {
    if (!this.bow.drawing) return;
    this.pointer = this.posOf(e);
    this.bow.setDraw(this.pointer, this.maxPull());
    this.fire();
  }

  private maxPull(): number {
    return (this.renderer?.width ?? 400) * MAX_PULL_FRAC;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private setMode(mode: GameMode): void {
    this.mode = mode;
    this.score = 0;
    this.lastScore = null;
    this.gameOver = false;
    this.arrowsLeft = CHALLENGE_ARROWS;
    this.target.setMode(mode);
    for (const a of this.arrows) a.active = false;
    this.particles.clear();
    this.rollWind();
  }

  private rollWind(): void {
    this.wind = Math.round((Math.random() * 2 - 1) * 100) / 100;
    this.physics.wind = this.wind * WIND_ACCEL;
  }

  private acquireArrow(): Arrow {
    let a = this.arrows.find((x) => !x.active);
    if (!a) a = this.arrows.find((x) => x.stuck) ?? this.arrows[0];
    return a;
  }

  private anyFlying(): boolean {
    return this.arrows.some((a) => a.active && !a.stuck);
  }

  private fire(): void {
    const power = this.bow.power;
    const dir = this.bow.direction();
    this.bow.drawing = false;
    if (power < 0.06) {
      this.bow.release();
      return;
    }
    if (this.mode === "challenge" && (this.arrowsLeft <= 0 || this.gameOver)) {
      this.bow.release();
      return;
    }

    const speed = MIN_SPEED + power * (MAX_SPEED - MIN_SPEED);
    const start: Vec2 = {
      x: this.bow.anchor.x + dir.x * ARROW_LEN * 0.5,
      y: this.bow.anchor.y + dir.y * ARROW_LEN * 0.5,
    };
    const vel: Vec2 = { x: dir.x * speed, y: dir.y * speed };
    this.physics.wind = this.wind * WIND_ACCEL;
    this.acquireArrow().reset(start, vel);

    this.sound.play("release");
    this.sound.play("arrow_fly");
    if (this.mode === "challenge") this.arrowsLeft -= 1;
    this.bow.release();
  }

  // ── Collision & scoring ───────────────────────────────────────────────────

  private collide(a: Arrow): void {
    const r = this.renderer;
    if (!r) return;
    const tip = a.tip();
    const dc = dist(tip, this.target.center);

    // Inside the target face: score by how close the trajectory gets to the
    // centre, not by where the rim is first touched. Track the minimum distance
    // (and the speed there) and resolve once the arrow starts moving away.
    if (!a.passedTarget && dc <= this.target.radius) {
      if (!a.tracking || dc < a.minDist) {
        a.tracking = true;
        a.minDist = dc;
        a.minPos = { x: tip.x, y: tip.y };
        a.minSpeed = length(a.vel);
        return;
      }
      this.resolveTarget(a);
      return;
    }
    if (a.tracking) {
      // Left the target face after entering — resolve at the closest point.
      this.resolveTarget(a);
      return;
    }

    if (tip.y >= r.groundY) {
      const at: Vec2 = { x: tip.x, y: r.groundY };
      a.embed(at, a.angle);
      this.sound.stop("arrow_fly");
      this.particles.spawnBurst(at, "#a3a380", 10, 160);
      this.rollWind();
      return;
    }

    // Off-screen → recycle.
    if (tip.x > r.width + 80 || tip.x < -80 || tip.y > r.height + 120 || tip.y < -120) {
      a.active = false;
      this.sound.stop("arrow_fly");
      this.rollWind();
    }
  }

  /**
   * Decide what happens when an arrow reaches its closest approach to the
   * target. A slow-enough arrow embeds and scores; a fast one (e.g. a full-power
   * draw) is moving too quickly to catch — it punches over the top and sails
   * past for a miss.
   */
  private resolveTarget(a: Arrow): void {
    a.tracking = false;
    a.passedTarget = true; // this arrow can't score again this flight
    if (a.minSpeed <= EMBED_MAX_SPEED) {
      this.scoreHit(a);
    }
    // else: too fast — keep flying; ground/off-screen handling recycles it.
  }

  private scoreHit(a: Arrow): void {
    const ring = this.target.ringForDistance(a.minDist);
    a.embed(a.minPos, a.angle);
    a.attachTo(this.target.center); // ride along in moving mode
    a.tracking = false;
    this.target.hit();
    this.sound.stop("arrow_fly");
    this.sound.play("hit");
    this.score += ring;
    this.lastScore = ring;

    const gold = ring >= 9;
    this.particles.spawnBurst(a.minPos, gold ? "#fde047" : "#f8fafc", gold ? 26 : 16, 280);
    this.particles.spawnPulse(this.target.center, this.target.radius, "rgba(255,255,255,0.9)");
    this.particles.spawnText({ x: a.minPos.x, y: a.minPos.y - 14 }, `+${ring}`, gold ? "#fde047" : "#ffffff");
    if (ring === 10) {
      this.particles.spawnFlash(this.target.center);
      this.sound.play("bullseye");
    }
    this.rollWind();
  }

  // ── Aim guide (dotted predicted trajectory while drawing) ──────────────────

  private drawAimGuide(ctx: CanvasRenderingContext2D): void {
    if (!this.bow.drawing || this.bow.power < 0.06) return;
    const dir = this.bow.direction();
    const speed = MIN_SPEED + this.bow.power * (MAX_SPEED - MIN_SPEED);
    const pos: Vec2 = {
      x: this.bow.anchor.x + dir.x * ARROW_LEN * 0.5,
      y: this.bow.anchor.y + dir.y * ARROW_LEN * 0.5,
    };
    const vel: Vec2 = { x: dir.x * speed, y: dir.y * speed };
    const step = 1 / 60;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 70; i++) {
      vel.x += this.physics.wind * step;
      vel.y += this.physics.gravity * step;
      const d = Math.max(0, 1 - this.physics.drag * step);
      vel.x *= d;
      vel.y *= d;
      pos.x += vel.x * step;
      pos.y += vel.y * step;
      if (pos.y > (this.renderer?.groundY ?? 9999)) break;
      if (i % 5 === 0) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}
