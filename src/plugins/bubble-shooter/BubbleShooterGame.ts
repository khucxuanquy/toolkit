import { Bubble, BUBBLE_RADIUS, BUBBLE_DIAMETER, ROW_HEIGHT } from "./entities/Bubble";
import { Renderer } from "./rendering/Renderer";
import { ParticleRenderer } from "./rendering/ParticleRenderer";
import { GridSystem, COLS_EVEN, COLS_ODD } from "./systems/GridSystem";
import { PhysicsSystem, SHOOT_SPEED } from "./systems/PhysicsSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { SoundManager } from "./managers/SoundManager";
import { LevelManager } from "./managers/LevelManager";
import type { BubbleColor, BubbleType, BubbleStrings, GameMode, GameStatus, GridPos } from "./types";
import { COLORS, clamp, DEFAULT_BUBBLE_STRINGS, fmt } from "./types";
import { normalize, angleToVec } from "./utils/math";

// ── Constants ───────────────────────────────────────────────────────────────

const CEILING_PAD = 68;    // px from top of canvas to bubble ceiling
const SHOOTER_PAD = 72;    // px from bottom to shooter centre
const DANGER_PAD = 110;    // px above shooter that triggers game-over
const MIN_AIM_ANGLE = 0.22; // rad from horizontal — prevents nearly-horizontal shots
const POP_DURATION = 0.22;
const DROP_GRAVITY = 520;
const ATTACH_SCALE_START = 1.35;
const ATTACH_DURATION = 0.14;
const ROWS_PER_STEP_CLASSIC = 12; // shots between new-row additions (classic)
const TIMED_DURATION = 120;       // seconds for timed mode
const SURVIVAL_STEP_INITIAL = 9;  // shots between rows in survival
const SCORE_BASE = 30;
const SCORE_PER_EXTRA = 15;
const SCORE_FLOAT_DROP = 10;
const HIGH_SCORE_KEY = "bs_highScore";

// ── Helpers ─────────────────────────────────────────────────────────────────

function pickColor(activeColors: BubbleColor[]): BubbleColor {
  return activeColors[Math.floor(Math.random() * activeColors.length)];
}

function pickSpecialOrNormal(activeColors: BubbleColor[], movesUsed: number): { color: BubbleColor; type: BubbleType } {
  const color = pickColor(activeColors);
  const roll = Math.random();
  if (movesUsed > 5) {
    if (roll < 0.03) return { color, type: "bomb" };
    if (roll < 0.055) return { color, type: "rainbow" };
    if (roll < 0.07) return { color, type: "lightning" };
  }
  return { color, type: "normal" };
}

// ── BubbleShooterGame ────────────────────────────────────────────────────────

export class BubbleShooterGame {
  readonly id = "bubble-shooter";
  readonly name = "Bubble Shooter";
  readonly version = "1.0.0";

  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: Renderer | null = null;
  private particles = new ParticleRenderer();
  private grid = new GridSystem();
  private physics = new PhysicsSystem();
  private collision = new CollisionSystem();
  private sound = new SoundManager();
  private levels = new LevelManager();
  private resizeObserver: ResizeObserver | null = null;

  // Game state
  private mode: GameMode = "classic";
  private status: GameStatus = "idle";
  private score = 0;
  private bestScore = 0;
  private movesUsed = 0;
  private combo = 0;
  private timeLeft = TIMED_DURATION;
  private activeColors: BubbleColor[] = ["red", "blue", "green"];

  // Flying bubble
  private flyBubble: Bubble | null = null;
  private flyActive = false;

  // Queue
  private currentSpec: { color: BubbleColor; type: BubbleType } = { color: "red", type: "normal" };
  private nextSpec: { color: BubbleColor; type: BubbleType } = { color: "blue", type: "normal" };

  // Dropping (floating cluster) animation
  private dropping: Bubble[] = [];

  // Layout (recalculated each frame)
  private shooterX = 0;
  private shooterY = 0;
  private ceilingY = 0;
  private dangerY = 0;
  private leftWall = 0;
  private rightWall = 0;

  // Aim
  private aimAngle = -Math.PI / 2;
  private isPointerDown = false;

  // Progression counters
  private shotsSinceRow = 0;
  private survivalStep = SURVIVAL_STEP_INITIAL;

  // Mode buttons
  private modeButtons: { label: string; x: number; y: number; w: number; h: number; active: boolean; key: string }[] = [];
  private muteButton: { x: number; y: number; w: number; h: number } = { x: 0, y: 0, w: 36, h: 28 };

  // Localized UI strings
  private strings: BubbleStrings = DEFAULT_BUBBLE_STRINGS;

  // RAF
  private raf = 0;
  private lastTime = 0;
  private running = false;

  // Bound event handlers (for clean removal)
  private onPointerDown = (e: PointerEvent) => this.handlePointerDown(e);
  private onPointerMove = (e: PointerEvent) => this.handlePointerMove(e);
  private onPointerUp = (e: PointerEvent) => this.handlePointerUp(e);
  private onResize = () => this.renderer?.resize();
  private onVisibility = () => { if (document.hidden) this.pause(); };

  // ── GamePlugin lifecycle ─────────────────────────────────────────────────

  init(container: HTMLElement): void {
    this.container = container;
    this.bestScore = parseInt(localStorage.getItem(HIGH_SCORE_KEY) ?? "0", 10) || 0;

    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:crosshair;";
    container.appendChild(canvas);
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.renderer.strings = this.strings;

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver = new ResizeObserver(() => this.renderer?.resize());
    this.resizeObserver.observe(canvas);

    this.setupMode("classic");
  }

  /** Inject localized UI strings (safe to call any time). */
  setStrings(s: BubbleStrings): void {
    this.strings = s;
    if (this.renderer) this.renderer.strings = s;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  pause(): void {
    if (this.status === "playing") this.status = "paused";
    this.running = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
  }

  resume(): void {
    if (this.status === "paused") this.status = "playing";
    if (!this.running) this.start();
  }

  reset(): void {
    this.setupMode(this.mode);
  }

  getScore(): number { return this.score; }

  getState(): unknown {
    return {
      mode: this.mode, status: this.status,
      score: this.score, bestScore: this.bestScore,
      movesUsed: this.movesUsed, combo: this.combo,
    };
  }

  destroy(): void {
    this.pause();
    const canvas = this.canvas;
    if (canvas) {
      canvas.removeEventListener("pointerdown", this.onPointerDown);
      canvas.removeEventListener("pointermove", this.onPointerMove);
      canvas.removeEventListener("pointercancel", this.onPointerUp);
    }
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("resize", this.onResize);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.sound.dispose();
    this.particles.clear();
    if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
    this.canvas = null;
    this.renderer = null;
    this.container = null;
  }

  // ── Setup ────────────────────────────────────────────────────────────────

  private setupMode(mode: GameMode): void {
    this.mode = mode;
    this.score = 0;
    this.movesUsed = 0;
    this.combo = 0;
    this.shotsSinceRow = 0;
    this.survivalStep = SURVIVAL_STEP_INITIAL;
    this.timeLeft = TIMED_DURATION;
    this.flyActive = false;
    this.flyBubble = null;
    this.dropping = [];
    this.grid.clear();
    this.particles.clear();

    const colCount = Math.min(6, 3 + Math.floor(this.levels.levelIndex / 2));
    this.activeColors = COLORS.slice(0, colCount);

    if (mode === "level") {
      this.levels.reset();
      this.loadLevel();
    } else {
      const initialRows = mode === "survival" ? 6 : mode === "timed" ? 4 : 5;
      this.activeColors = COLORS.slice(0, 3);
      this.populateRandom(initialRows);
    }

    this.currentSpec = pickSpecialOrNormal(this.activeColors, 0);
    this.nextSpec = pickSpecialOrNormal(this.activeColors, 0);
    this.aimAngle = -Math.PI / 2;
    this.status = "playing";
  }

  private loadLevel(): void {
    const level = this.levels.level;
    this.activeColors = COLORS.slice(0, level.colorCount);
    const r = this.renderer;
    this.updateLayout(r?.width ?? 400, r?.height ?? 600);

    for (let rowIdx = 0; rowIdx < level.rows.length; rowIdx++) {
      const row = level.rows[rowIdx];
      const cols = this.grid.colsInRow(rowIdx);
      for (let c = 0; c < Math.min(row.length, cols); c++) {
        const cell = row[c];
        if (!cell) continue;
        const b = new Bubble(cell.color, cell.type);
        b.stuck = true; b.active = true;
        const pos = this.grid.cellPos(rowIdx, c);
        b.pos = { x: pos.x, y: pos.y };
        this.grid.set(rowIdx, c, b);
      }
    }
  }

  private populateRandom(rowCount: number): void {
    for (let r = 0; r < rowCount; r++) {
      const cols = this.grid.colsInRow(r);
      for (let c = 0; c < cols; c++) {
        const color = pickColor(this.activeColors);
        const b = new Bubble(color, "normal");
        b.stuck = true; b.active = true;
        const pos = this.grid.cellPos(r, c);
        b.pos = { x: pos.x, y: pos.y };
        this.grid.set(r, c, b);
      }
    }
  }

  private addNewRow(): void {
    const colors: (BubbleColor | null)[] = [];
    for (let c = 0; c < COLS_EVEN; c++) {
      colors.push(Math.random() < 0.85 ? pickColor(this.activeColors) : null);
    }
    this.grid.addRowAtTop(colors as BubbleColor[]);
    // Update positions of all existing bubbles
    this.grid.forEach((b, row, col) => {
      const p = this.grid.cellPos(row, col);
      b.pos = { x: p.x, y: p.y };
    });
  }

  // ── Core loop ─────────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const r = this.renderer;
    if (!r) return;
    r.resize();
    this.updateLayout(r.width, r.height);
    this.particles.update(dt);

    if (this.status !== "playing") return;

    // Timed mode countdown
    if (this.mode === "timed") {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) { this.timeLeft = 0; this.endGame(false); return; }
    }

    // Animate grid bubbles (attach bounce + pop)
    this.grid.forEach((b) => {
      if (b.attachTimer > 0) {
        b.attachTimer -= dt;
        const t = Math.max(0, b.attachTimer / ATTACH_DURATION);
        b.attachScale = 1 + (ATTACH_SCALE_START - 1) * t;
      } else {
        b.attachScale = 1;
      }
      if (b.popping) {
        b.popTimer += dt;
        const t = b.popTimer / POP_DURATION;
        b.popScale = 1 + t * 0.5;
        b.popAlpha = 1 - t;
        if (b.popTimer >= POP_DURATION) { b.popping = false; b.active = false; }
      }
    });

    // Dropping (floating cluster) animation
    this.dropping = this.dropping.filter((b) => {
      b.dropVy += DROP_GRAVITY * dt;
      b.pos.y += b.dropVy * dt;
      b.pos.x += (Math.random() - 0.5) * 2; // slight wobble
      b.popAlpha = Math.max(0, b.popAlpha - dt * 1.5);
      return b.pos.y < (this.renderer?.height ?? 800) + 60;
    });

    // Flying bubble
    if (this.flyActive && this.flyBubble) {
      const b = this.flyBubble;
      const bounced = this.physics.update(b.pos, b.vel, dt, this.leftWall, this.rightWall, BUBBLE_RADIUS);
      if (bounced) this.sound.play("bounce");

      const hit = this.collision.check(b.pos, this.grid, this.ceilingY);
      if (hit) {
        this.landBubble(b, hit.collidedWith);
      }
    }
  }

  private updateLayout(w: number, h: number): void {
    this.ceilingY = CEILING_PAD;
    this.shooterY = h - SHOOTER_PAD;
    this.shooterX = w / 2;
    this.dangerY = this.shooterY - DANGER_PAD;
    this.leftWall = 0;
    this.rightWall = w;
    this.grid.setLayout(w, this.ceilingY);

    // Update position of every placed bubble to match layout
    this.grid.forEach((b, row, col) => {
      if (!b.dropping) {
        const p = this.grid.cellPos(row, col);
        b.pos = { x: p.x, y: p.y };
      }
    });

    // Layout mode buttons in bottom HUD area
    const btnY = this.shooterY + 32;
    const btnH = 26;
    const gap = 6;
    const modeKeys: GameMode[] = ["classic", "level", "timed", "survival"];
    const labels = [this.strings.classic, this.strings.level, this.strings.timed, this.strings.survival];
    const totalW = w - 24;
    const btnW = (totalW - gap * 3) / 4;
    this.modeButtons = modeKeys.map((key, i) => ({
      key,
      label: labels[i],
      x: 12 + i * (btnW + gap),
      y: btnY,
      w: btnW,
      h: btnH,
      active: this.mode === key,
    }));

    this.muteButton = { x: w - 44, y: 8, w: 36, h: 28 };
  }

  // ── Landing & scoring ────────────────────────────────────────────────────

  private landBubble(b: Bubble, collidedWith: GridPos | null): void {
    const snap = this.grid.snapPos(b.pos, collidedWith);
    if (!snap) {
      // No space — game over
      this.flyActive = false;
      this.endGame(false);
      return;
    }

    // Place in grid
    b.stuck = true;
    b.vel = { x: 0, y: 0 };
    const cp = this.grid.cellPos(snap.row, snap.col);
    b.pos = { x: cp.x, y: cp.y };
    b.attachScale = ATTACH_SCALE_START;
    b.attachTimer = ATTACH_DURATION;
    this.grid.set(snap.row, snap.col, b);
    this.flyActive = false;
    this.sound.play("attach");

    this.movesUsed++;
    this.shotsSinceRow++;

    // Handle special types
    let removed: Bubble[] = [];

    if (b.type === "bomb") {
      removed = this.grid.bombExplode(snap.row, snap.col);
      this.combo = 0;
    } else if (b.type === "lightning") {
      removed = this.grid.lightningClear(snap.row);
      this.combo = 0;
    } else {
      // Normal / rainbow: match check
      const connected = this.grid.findConnected(snap.row, snap.col);
      if (connected.length >= 3) {
        removed = this.grid.removeCluster(connected);
        this.combo++;
      } else {
        this.combo = 0;
      }
    }

    if (removed.length >= 3) {
      this.popBubbles(removed, snap);
      // Check floating clusters
      const floating = this.grid.findFloatingClusters();
      if (floating.length) {
        const floatBubbles = this.grid.removeCluster(floating);
        this.startDropping(floatBubbles);
        this.score += floatBubbles.length * SCORE_FLOAT_DROP;
      }
      this.sound.play("pop");
      if (this.combo >= 2) this.sound.play("combo");
    }

    // Progress difficulty
    this.progressDifficulty();

    // Row addition (classic / survival / timed)
    const addRowEvery = this.mode === "survival" ? this.survivalStep : ROWS_PER_STEP_CLASSIC;
    if (this.mode !== "level" && this.shotsSinceRow >= addRowEvery) {
      this.shotsSinceRow = 0;
      this.addNewRow();
      if (this.mode === "survival") this.survivalStep = Math.max(4, this.survivalStep - 1);
    }

    // Check end conditions
    if (this.grid.hasBubbleBelowRow(this.worldToDangerRow())) {
      this.endGame(false);
      return;
    }
    if (this.grid.isEmpty() && this.mode === "level") {
      this.endGame(true);
      return;
    }
    if (this.mode === "level" && this.grid.isEmpty()) {
      this.endGame(true);
      return;
    }

    // Advance queue
    this.currentSpec = this.nextSpec;
    this.nextSpec = pickSpecialOrNormal(this.activeColors, this.movesUsed);
  }

  private worldToDangerRow(): number {
    return Math.floor((this.dangerY - this.ceilingY - BUBBLE_RADIUS) / ROW_HEIGHT) + 1;
  }

  private popBubbles(bubbles: Bubble[], epicenter: GridPos): void {
    const pts = SCORE_BASE + (bubbles.length - 3) * SCORE_PER_EXTRA;
    const multiplied = pts * Math.max(1, this.combo);
    this.score += multiplied;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(this.bestScore));
    }

    const cp = this.grid.cellPos(epicenter.row, epicenter.col);
    this.particles.spawnText({ x: cp.x, y: cp.y - 18 }, `+${multiplied}`, this.combo >= 2 ? "#fde047" : "#ffffff");
    if (this.combo >= 2) {
      this.particles.spawnText({ x: cp.x, y: cp.y - 40 }, fmt(this.strings.comboFloat, { n: this.combo }), "#f97316");
    }

    for (const b of bubbles) {
      b.popping = true;
      b.popTimer = 0;
      b.popScale = 1;
      b.popAlpha = 1;
      this.particles.spawnBurst(b.pos, b.fillColor, 10, 200);
      this.particles.spawnRing(b.pos, b.lightColor);
    }
  }

  private startDropping(bubbles: Bubble[]): void {
    for (const b of bubbles) {
      b.dropping = true;
      b.dropVy = -80 + Math.random() * 160;
      b.popAlpha = 1;
      b.active = true;
      this.dropping.push(b);
    }
  }

  private progressDifficulty(): void {
    // Expand colour palette every 30 shots
    const targetColors = Math.min(COLORS.length, 3 + Math.floor(this.movesUsed / 30));
    if (this.activeColors.length < targetColors) {
      this.activeColors = COLORS.slice(0, targetColors);
    }
  }

  private endGame(win: boolean): void {
    this.status = win ? "win" : "over";
    this.flyActive = false;
    this.sound.play("game_over");
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem(HIGH_SCORE_KEY, String(this.bestScore));
    }
  }

  // ── Shooting ──────────────────────────────────────────────────────────────

  private shoot(): void {
    if (this.flyActive) return;
    if (this.status !== "playing") return;

    // Guard: can't shoot nearly horizontally or downward
    const angleDy = Math.sin(this.aimAngle);
    if (angleDy > -0.05) return;

    const b = new Bubble(this.currentSpec.color, this.currentSpec.type);
    const dir = angleToVec(this.aimAngle);
    b.reset(this.currentSpec.color, this.currentSpec.type);
    b.pos = { x: this.shooterX, y: this.shooterY - 28 };
    b.vel = { x: dir.x * SHOOT_SPEED, y: dir.y * SHOOT_SPEED };
    b.stuck = false;

    this.flyBubble = b;
    this.flyActive = true;
    this.sound.play("shoot");
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private posOf(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private updateAimFromPos(p: { x: number; y: number }): void {
    const dx = p.x - this.shooterX;
    const dy = p.y - this.shooterY;
    let angle = Math.atan2(dy, dx);
    // Clamp: must point upward (negative y direction), with min angle from horizontal
    angle = clamp(angle, -(Math.PI - MIN_AIM_ANGLE), -MIN_AIM_ANGLE);
    this.aimAngle = angle;
  }

  private hitModeButton(p: { x: number; y: number }): string | null {
    for (const b of this.modeButtons) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b.key;
    }
    return null;
  }

  private hitMuteButton(p: { x: number; y: number }): boolean {
    const m = this.muteButton;
    return p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y && p.y <= m.y + m.h;
  }

  private handlePointerDown(e: PointerEvent): void {
    e.preventDefault();
    this.sound.resume();
    const p = this.posOf(e);
    this.isPointerDown = true;

    // Mute button
    if (this.hitMuteButton(p)) {
      this.sound.isMuted ? this.sound.unmute() : this.sound.mute();
      return;
    }

    // Mode buttons
    const modeKey = this.hitModeButton(p);
    if (modeKey) {
      this.setupMode(modeKey as GameMode);
      return;
    }

    // Game over / win: restart on tap
    if (this.status === "over" || this.status === "win") {
      this.setupMode(this.mode);
      return;
    }

    // Paused: resume on tap
    if (this.status === "paused") {
      this.resume();
      return;
    }

    this.updateAimFromPos(p);
    try { this.canvas?.setPointerCapture(e.pointerId); } catch { /* ok */ }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) {
      this.updateAimFromPos(this.posOf(e));
      return;
    }
    this.updateAimFromPos(this.posOf(e));
  }

  private handlePointerUp(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    this.isPointerDown = false;
    this.updateAimFromPos(this.posOf(e));
    this.shoot();
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private draw(): void {
    const r = this.renderer;
    if (!r) return;

    r.clear();
    r.drawBackground(this.ceilingY, this.dangerY);

    // Grid bubbles
    r.drawGrid(this.grid);
    r.drawPopping(this.grid);
    r.drawDropping(this.dropping);

    // Flying bubble
    if (this.flyActive && this.flyBubble) r.drawFlyingBubble(this.flyBubble);

    // Aim guide (only when idle — not flying)
    if (!this.flyActive && this.status === "playing") {
      r.drawAimGuide(this.shooterX, this.shooterY, this.aimAngle, this.leftWall, this.rightWall, this.ceilingY);
    }

    // Shooter
    r.drawShooter(this.shooterX, this.shooterY, this.currentSpec, this.nextSpec, this.aimAngle);

    // Particles
    this.particles.draw(r.ctx);

    // Mode buttons
    r.drawModeButtons(this.modeButtons);

    // Mute button
    const ctx = r.ctx;
    ctx.fillStyle = "rgba(15,23,42,0.55)";
    ctx.beginPath();
    const m = this.muteButton;
    ctx.roundRect(m.x, m.y, m.w, m.h, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "14px system-ui";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.sound.isMuted ? "🔇" : "🔊", m.x + m.w / 2, m.y + m.h / 2);

    // HUD
    r.drawHUD({
      mode: this.mode, status: this.status,
      score: this.score, bestScore: this.bestScore,
      movesUsed: this.movesUsed, bubblesLeft: this.countBubblesLeft(),
      timeLeft: this.timeLeft, combo: this.combo,
      currentBubble: this.currentSpec, nextBubble: this.nextSpec,
      shooterX: this.shooterX, shooterY: this.shooterY,
      aimAngle: this.aimAngle, isAiming: this.isPointerDown,
      flyingBubble: this.flyBubble,
      grid: this.grid, dropping: this.dropping,
      ceilingY: this.ceilingY, leftWall: this.leftWall, rightWall: this.rightWall,
      muted: this.sound.isMuted, dangerY: this.dangerY,
    });

    // Overlays
    if (this.status === "over" || this.status === "win") {
      r.drawGameOver(this.score, this.bestScore, this.status === "win");
    } else if (this.status === "paused") {
      r.drawPausedOverlay();
    }
  }

  private countBubblesLeft(): number {
    let count = 0;
    this.grid.forEach(() => count++);
    return count;
  }
}
