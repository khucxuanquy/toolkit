import { Renderer } from "./rendering/Renderer";
import { ParticleSystem } from "./rendering/ParticleSystem";
import { SoundManager } from "./managers/SoundManager";
import { Ball, BALL_R } from "./entities/Ball";
import { Cue } from "./Cue";
import { buildRack } from "./Rack";
import { stepFixed, FIXED_DT, MAX_SHOT_SPEED } from "./systems/Physics";
import { traceAim } from "./systems/Aim";
import { evaluate8Ball, evaluate9Ball, type RuleContext } from "./Rules";
import { planShot, findFreeSpot } from "./AI";
import { PLAY_W, PLAY_H, CUSHION, FOOT_SPOT, HEAD_SPOT } from "./Table";
import type {
  GamePlugin,
  GameVariant,
  PlayMode,
  Group,
  Phase,
  PhysEvent,
  ShotResult,
  UIButton,
  Vec2,
  BilliardsStrings,
} from "./types";
import { clamp, fmt, DEFAULT_BILLIARDS_STRINGS } from "./types";
import { dist } from "./utils/math";

const AI_THINK_MS = 750;

/**
 * Full billiards game (8-Ball & 9-Ball) implementing the platform
 * {@link GamePlugin} contract. Renders to one canvas; handles input, physics,
 * the rules engine, turn management, a basic AI and local 2-player.
 */
export class BilliardsGame implements GamePlugin {
  readonly id = "billiards";
  readonly name = "Billiards";
  readonly version = "1.0.0";

  private container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private renderer: Renderer | null = null;
  private readonly particles = new ParticleSystem();
  private readonly sound = new SoundManager();
  private readonly cue = new Cue();

  // Game state
  private phase: Phase = "menu";
  private variant: GameVariant = "8ball";
  private mode: PlayMode = "1p";
  private balls: Ball[] = [];
  private current: 0 | 1 = 0;
  private open = true; // 8-ball table open
  private groups: [Group, Group] = [null, null];
  private isBreak = true;
  private winner: 0 | 1 | null = null;
  private message = "";
  private messageT = 0;

  // Shot tracking
  private shot: ShotResult = this.blankShot();
  private contactHappened = false;
  private remainingBefore: number[] = [];

  // Input
  private pointerDown = false;
  private hoverPlay: Vec2 = { x: 0, y: 0 };
  private draggingCue = false;

  // HUD geometry (screen px), rebuilt each frame
  private buttons: UIButton[] = [];
  private spinPuck = { x: 0, y: 0, r: 26 };
  private powerRect = { x: 0, y: 0, w: 0, h: 0 };

  // AI
  private aiTimer: ReturnType<typeof setTimeout> | null = null;

  // Current canvas cursor (only written on change).
  private currentCursor = "crosshair";

  // Localized UI strings.
  private s: BilliardsStrings = DEFAULT_BILLIARDS_STRINGS;

  // RAF
  private raf = 0;
  private last = 0;
  private running = false;
  private physAcc = 0; // fixed-timestep accumulator

  private onDown = (e: PointerEvent) => this.handleDown(e);
  private onMove = (e: PointerEvent) => this.handleMove(e);
  private onUp = (e: PointerEvent) => this.handleUp(e);
  private onContext = (e: Event) => e.preventDefault();
  private resizeObserver: ResizeObserver | null = null;
  private onVisibility = () => {
    if (document.hidden) this.pause();
    else if (this.container) this.resume();
  };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  init(container: HTMLElement): void {
    this.container = container;
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "display:block;width:100%;height:100%;touch-action:none;cursor:crosshair;";
    container.appendChild(canvas);
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);

    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("contextmenu", this.onContext);
    this.resizeObserver = new ResizeObserver(() => this.renderer?.resize());
    this.resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", this.onVisibility);

    this.phase = "menu";
  }

  /** Inject localized UI strings (safe to call any time). */
  setStrings(strings: BilliardsStrings): void {
    this.s = strings;
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
    this.clearAI();
  }

  resume(): void {
    if (this.running || !this.renderer) return;
    this.start();
    if (this.mode === "1p" && this.current === 1 && (this.phase === "aiming" || this.phase === "ballinhand")) {
      this.scheduleAI();
    }
  }

  reset(): void {
    this.clearAI();
    if (this.phase === "menu") return;
    this.newRack(this.variant);
  }

  destroy(): void {
    this.pause();
    const c = this.canvas;
    if (c) {
      c.removeEventListener("pointerdown", this.onDown);
      c.removeEventListener("pointermove", this.onMove);
      c.removeEventListener("pointercancel", this.onUp);
      c.removeEventListener("contextmenu", this.onContext);
    }
    window.removeEventListener("pointerup", this.onUp);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.sound.dispose();
    this.particles.clear();
    if (c?.parentNode) c.parentNode.removeChild(c);
    this.canvas = null;
    this.renderer = null;
    this.container = null;
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  private startGame(variant: GameVariant, mode: PlayMode): void {
    this.variant = variant;
    this.mode = mode;
    this.newRack(variant);
  }

  private newRack(variant: GameVariant): void {
    this.clearAI();
    this.balls = buildRack(variant);
    this.open = variant === "8ball";
    this.groups = [null, null];
    this.isBreak = true;
    this.current = 0;
    this.winner = null;
    this.cue.reset();
    this.cue.resetSpin();
    this.particles.clear();
    this.phase = "aiming";
    this.setMessage(variant === "8ball" ? this.s.break8 : this.s.break9);
  }

  private blankShot(): ShotResult {
    return {
      firstContact: null,
      pocketed: [],
      cueScratched: false,
      railAfterContact: false,
      isBreak: false,
    };
  }

  private setMessage(m: string): void {
    this.message = m;
    this.messageT = 3.2;
  }

  // ── Core loop ─────────────────────────────────────────────────────────────

  private tick = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const r = this.renderer;
    if (!r) return;
    r.resize();
    this.particles.update(dt);
    if (this.messageT > 0) this.messageT -= dt;

    for (const b of this.balls) {
      if (b.sinking) {
        b.sinkT += dt * 5;
        if (b.sinkT >= 1) b.sinking = false;
      }
    }

    if (this.phase === "shooting") {
      // Fixed-timestep accumulator → frame-rate-independent, smooth motion.
      this.physAcc += dt;
      const events: PhysEvent[] = [];
      let steps = 0;
      while (this.physAcc >= FIXED_DT && steps < 600) {
        stepFixed(this.balls, events);
        this.physAcc -= FIXED_DT;
        steps++;
      }
      this.processEvents(events);
      const moving = this.balls.some((b) => !b.pocketed && b.speed > 0);
      if (!moving) {
        this.physAcc = 0;
        this.finalizeShot();
      }
    }
  }

  private processEvents(events: PhysEvent[]): void {
    for (const e of events) {
      if (e.type === "ball") {
        const a = e.a ?? -1;
        const b = e.b ?? -1;
        if ((a === 0 || b === 0) && this.shot.firstContact === null) {
          const other = a === 0 ? b : a;
          if (other > 0) {
            this.shot.firstContact = other;
            this.contactHappened = true;
          }
        }
        this.sound.play("ball", e.strength);
      } else if (e.type === "cushion") {
        if (this.contactHappened) this.shot.railAfterContact = true;
        this.sound.play("cushion", e.strength);
      } else if (e.type === "pocket") {
        const num = e.a ?? -1;
        if (num === 0) this.shot.cueScratched = true;
        else {
          this.shot.pocketed.push(num);
          if (this.contactHappened) this.shot.railAfterContact = true;
        }
        const col = num === 0 ? "#ffffff" : (this.balls.find((x) => x.num === num)?.color ?? "#ffffff");
        this.particles.burst(e.pos, col, 16, 240);
        this.sound.play("pocket");
      }
    }
  }

  // ── Shooting ──────────────────────────────────────────────────────────────

  private fire(angle: number, power: number, spinX: number, spinY: number): void {
    if (power < 0.05) {
      this.cue.charging = false;
      this.cue.power = 0;
      return;
    }
    const cueBall = this.balls[0];
    cueBall.vel.x = Math.cos(angle) * power * MAX_SHOT_SPEED;
    cueBall.vel.y = Math.sin(angle) * power * MAX_SHOT_SPEED;
    cueBall.spinX = spinX;
    cueBall.spinY = spinY;
    cueBall.spinPending = spinX !== 0 || spinY !== 0;

    this.shot = this.blankShot();
    this.shot.isBreak = this.isBreak;
    this.contactHappened = false;
    this.remainingBefore = this.balls.filter((b) => !b.pocketed && !b.isCue).map((b) => b.num);

    this.phase = "shooting";
    this.physAcc = 0;
    this.cue.charging = false;
    this.cue.power = 0;
    this.sound.play("cue", Math.max(0.3, power));
  }

  private finalizeShot(): void {
    const ctx: RuleContext = {
      shooter: this.current,
      open: this.open,
      groups: this.groups,
      remainingBefore: this.remainingBefore,
      shot: this.shot,
    };
    const verdict = this.variant === "9ball" ? evaluate9Ball(ctx, this.s) : evaluate8Ball(ctx, this.s);

    if (verdict.groups) this.groups = verdict.groups;
    if (verdict.open !== undefined) this.open = verdict.open;

    // Respot illegally pocketed key balls (8 / 9).
    for (const num of verdict.respot) {
      const ball = this.balls.find((b) => b.num === num);
      if (ball) {
        ball.pocketed = false;
        ball.sinking = false;
        ball.stop();
        ball.pos = findFreeSpot(FOOT_SPOT, this.balls);
      }
    }

    this.setMessage(verdict.message);
    this.isBreak = false;

    if (verdict.gameOver) {
      this.winner = verdict.winner;
      this.phase = "gameover";
      this.sound.play(verdict.winner === 0 || this.mode === "2p" ? "win" : "lose");
      this.clearAI();
      return;
    }

    if (verdict.turnPasses) this.current = (this.current === 0 ? 1 : 0) as 0 | 1;

    this.cue.reset();

    if (verdict.ballInHand) {
      const cueBall = this.balls[0];
      cueBall.pocketed = false;
      cueBall.sinking = false;
      cueBall.stop();
      cueBall.pos = findFreeSpot(this.shot.cueScratched ? HEAD_SPOT : cueBall.pos, this.balls);
      this.phase = "ballinhand";
    } else {
      this.phase = "aiming";
    }

    if (this.mode === "1p" && this.current === 1) this.scheduleAI();
  }

  // ── AI ────────────────────────────────────────────────────────────────────

  private scheduleAI(): void {
    this.clearAI();
    this.aiTimer = setTimeout(() => this.runAI(), AI_THINK_MS);
  }

  private clearAI(): void {
    if (this.aiTimer) {
      clearTimeout(this.aiTimer);
      this.aiTimer = null;
    }
  }

  private runAI(): void {
    this.aiTimer = null;
    if (this.mode !== "1p" || this.current !== 1) return;
    if (this.phase !== "aiming" && this.phase !== "ballinhand") return;

    const plan = planShot(this.balls, this.variant, this.groups[1], this.open, this.phase === "ballinhand");
    if (plan.cuePos) {
      this.balls[0].pos = findFreeSpot(plan.cuePos, this.balls);
    }
    this.fire(plan.angle, plan.power, plan.spinX, plan.spinY);
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  private cssOf(e: PointerEvent): Vec2 {
    const rect = this.canvas!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private hitButton(p: Vec2): UIButton | null {
    for (const b of this.buttons) {
      if (p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) return b;
    }
    return null;
  }

  private isHumanTurn(): boolean {
    return !(this.mode === "1p" && this.current === 1);
  }

  private handleDown(e: PointerEvent): void {
    e.preventDefault();
    this.sound.resume();
    const css = this.cssOf(e);

    const btn = this.hitButton(css);
    if (btn) {
      this.handleButton(btn.key);
      return;
    }

    if (!this.isHumanTurn()) return;

    if (this.phase === "ballinhand") {
      this.draggingCue = true;
      this.placeCue(css);
      return;
    }

    if (this.phase === "aiming") {
      // Spin puck?
      if (dist(css, this.spinPuck) <= this.spinPuck.r + 2) {
        this.setSpinFromPuck(css);
        return;
      }
      this.pointerDown = true;
      this.cue.charging = true;
      this.updateAim(css, true);
      try {
        this.canvas?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  private handleMove(e: PointerEvent): void {
    const css = this.cssOf(e);
    if (!this.renderer) return;
    this.hoverPlay = this.renderer.screenToPlay(css.x, css.y);

    if (!this.isHumanTurn()) return;

    if (this.phase === "ballinhand" && this.draggingCue) {
      this.placeCue(css);
      return;
    }
    if (this.phase === "aiming") {
      this.updateAim(css, this.pointerDown);
    }
  }

  private handleUp(e: PointerEvent): void {
    const css = this.cssOf(e);
    if (this.phase === "ballinhand" && this.draggingCue) {
      this.draggingCue = false;
      this.placeCue(css, true);
      this.phase = "aiming";
      return;
    }
    if (this.phase === "aiming" && this.pointerDown) {
      this.pointerDown = false;
      this.updateAim(css, true);
      if (this.cue.power >= 0.05) {
        this.fire(this.cue.angle, this.cue.power, this.cue.spinX, this.cue.spinY);
      } else {
        this.cue.charging = false;
        this.cue.power = 0;
      }
    }
  }

  /** Aim direction = from pointer toward the cue ball (pull-back slingshot). */
  private updateAim(css: Vec2, charging: boolean): void {
    if (!this.renderer) return;
    const p = this.renderer.screenToPlay(css.x, css.y);
    const cueBall = this.balls[0];
    const dx = cueBall.pos.x - p.x;
    const dy = cueBall.pos.y - p.y;
    this.cue.angle = Math.atan2(dy, dx);
    if (charging) {
      const pull = Math.hypot(dx, dy);
      this.cue.setPull(pull);
    }
  }

  private placeCue(css: Vec2, settle = false): void {
    if (!this.renderer) return;
    const p = this.renderer.screenToPlay(css.x, css.y);
    const cueBall = this.balls[0];
    if (settle) {
      cueBall.pos = findFreeSpot(p, this.balls);
    } else {
      cueBall.pos = {
        x: clamp(p.x, CUSHION + BALL_R, PLAY_W - CUSHION - BALL_R),
        y: clamp(p.y, CUSHION + BALL_R, PLAY_H - CUSHION - BALL_R),
      };
    }
  }

  private setSpinFromPuck(css: Vec2): void {
    const r = this.spinPuck.r * 0.7;
    let sx = (css.x - this.spinPuck.x) / r;
    let sy = -(css.y - this.spinPuck.y) / r;
    const m = Math.hypot(sx, sy);
    if (m > 1) {
      sx /= m;
      sy /= m;
    }
    this.cue.spinX = clamp(sx, -1, 1);
    this.cue.spinY = clamp(sy, -1, 1);
  }

  private handleButton(key: string): void {
    switch (key) {
      case "mute":
        this.sound.isMuted ? this.sound.unmute() : this.sound.mute();
        break;
      case "menu":
        this.clearAI();
        this.phase = "menu";
        break;
      case "v8":
        this.variant = "8ball";
        break;
      case "v9":
        this.variant = "9ball";
        break;
      case "m1":
        this.mode = "1p";
        break;
      case "m2":
        this.mode = "2p";
        break;
      case "start":
        this.startGame(this.variant, this.mode);
        break;
      case "again":
        this.newRack(this.variant);
        break;
    }
  }

  // ── Rendering ───────────────────────────────────────────────────────────

  private legalBallOn(): number | null {
    const live = this.balls.filter((b) => !b.pocketed && !b.isCue);
    if (!live.length) return null;
    if (this.variant === "9ball") return Math.min(...live.map((b) => b.num));
    // 8-ball: highlight the 8 only when the current player is on it.
    const g = this.groups[this.current];
    if (!this.open && g) {
      const remain = live.filter((b) => (g === "solids" ? b.num <= 7 : b.num >= 9));
      if (remain.length === 0) return 8;
    }
    return null;
  }

  /** Hand cursor while placing a ball-in-hand; crosshair when aiming. */
  private updateCursor(): void {
    let c = "default";
    if (this.phase === "ballinhand" && this.isHumanTurn()) c = this.draggingCue ? "grabbing" : "grab";
    else if (this.phase === "aiming" && this.isHumanTurn()) c = "crosshair";
    if (this.canvas && c !== this.currentCursor) {
      this.canvas.style.cursor = c;
      this.currentCursor = c;
    }
  }

  private draw(): void {
    const r = this.renderer;
    if (!r) return;
    this.updateCursor();
    r.clear();

    r.drawTable();
    if (this.phase !== "menu") {
      r.setWorldTransform();
      r.drawBalls(this.balls);
      this.particles.draw(r.ctx, 46, 46); // RAIL offset

      if ((this.phase === "aiming" || this.phase === "ballinhand") && this.isHumanTurn()) {
        const cueBall = this.balls[0];
        const dir = { x: Math.cos(this.cue.angle), y: Math.sin(this.cue.angle) };
        const trace = traceAim(cueBall, this.balls, dir);
        r.drawAim(trace, this.legalBallOn(), this.balls);
        r.drawCueStick(cueBall.pos, this.cue.angle, this.cue.power, this.cue.recoil);
      }
    }

    r.setScreenTransform();
    this.layoutAndDrawHUD();
  }

  private layoutAndDrawHUD(): void {
    const r = this.renderer!;
    const W = r.width;
    const H = r.height;
    this.buttons = [];

    if (this.phase === "menu") {
      this.drawMenu(W, H);
      return;
    }

    const s = this.s;

    // Top bar buttons.
    const menuBtn: UIButton = { key: "menu", label: s.menu, x: 10, y: 8, w: 66, h: 30 };
    const muteBtn: UIButton = { key: "mute", label: this.sound.isMuted ? "🔇" : "🔊", x: W - 50, y: 8, w: 40, h: 30 };
    this.buttons.push(menuBtn, muteBtn);
    r.drawButton(menuBtn);
    r.drawButton(muteBtn);

    // Turn / info panel.
    const pw = 300;
    r.panel(W / 2 - pw / 2, 8, pw, 44, 0.6);
    const youAI = this.mode === "1p" && this.current === 1;
    const who = this.mode === "1p"
      ? (this.current === 0 ? s.you : s.cpu)
      : fmt(s.player, { n: this.current + 1 });
    const variantLabel = this.variant === "8ball" ? s.eightBall : s.nineBall;
    r.text(variantLabel, W / 2 - pw / 2 + 14, 30, "700 14px system-ui", "#cbd5e1", "left");
    r.text(`${fmt(s.turn, { who })}${youAI ? s.thinking : ""}`, W / 2, 24, "700 15px system-ui", "#fff", "center");

    // Group assignment (8-ball).
    if (this.variant === "8ball" && !this.open) {
      const gn = (g: Group) => (g === "solids" ? s.solids : g === "stripes" ? s.stripes : s.unknownGroup);
      const label = this.mode === "1p"
        ? fmt(s.youGroup, { g: gn(this.groups[0]) })
        : fmt(s.twoGroups, { g1: gn(this.groups[0]), g2: gn(this.groups[1]) });
      r.text(label, W / 2, 42, "600 11px system-ui", "rgba(203,213,225,0.85)", "center");
    } else if (this.variant === "9ball") {
      const lo = this.legalBallOn();
      if (lo !== null) r.text(fmt(s.ballOn, { n: lo }), W / 2, 42, "600 11px system-ui", "rgba(203,213,225,0.85)", "center");
    }

    // Message banner.
    if (this.messageT > 0 && this.message) {
      const mw = Math.min(W - 40, 460);
      r.panel(W / 2 - mw / 2, H - 44, mw, 32, 0.66);
      r.text(this.message, W / 2, H - 28, "600 13px system-ui", "#fde68a", "center");
    }

    // Ball-in-hand hint.
    if (this.phase === "ballinhand" && this.isHumanTurn()) {
      r.text(s.ballInHand, W / 2, 70, "600 12px system-ui", "#93c5fd", "center");
    }

    // Spin puck + power meter while aiming (human).
    if (this.phase === "aiming" && this.isHumanTurn()) {
      this.spinPuck = { x: 40, y: H - 48, r: 26 };
      r.drawSpinPuck(this.spinPuck.x, this.spinPuck.y, this.spinPuck.r, this.cue.spinX, this.cue.spinY);
      r.text(s.spin, this.spinPuck.x, H - 12, "600 10px system-ui", "rgba(203,213,225,0.8)", "center");

      this.powerRect = { x: W - 28, y: H - 150, w: 16, h: 120 };
      r.drawPowerMeter(this.powerRect.x, this.powerRect.y, this.powerRect.w, this.powerRect.h, this.cue.power);
    }

    if (this.phase === "gameover") this.drawGameOver(W, H);
  }

  private drawMenu(W: number, H: number): void {
    const r = this.renderer!;
    r.dim(0.55);

    const cw = Math.min(W - 40, 380);
    const ch = 320;
    const cx = W / 2;
    const top = H / 2 - ch / 2;
    r.panel(cx - cw / 2, top, cw, ch, 0.85);

    const s = this.s;
    r.text(s.title, cx, top + 38, "800 26px system-ui", "#fff", "center");
    r.text(s.chooseGame, cx, top + 66, "500 13px system-ui", "rgba(203,213,225,0.8)", "center");

    const bw = (cw - 60) / 2;
    const v8: UIButton = { key: "v8", label: s.eightBall, x: cx - bw - 6, y: top + 90, w: bw, h: 44, active: this.variant === "8ball" };
    const v9: UIButton = { key: "v9", label: s.nineBall, x: cx + 6, y: top + 90, w: bw, h: 44, active: this.variant === "9ball" };

    r.text(s.players, cx, top + 156, "600 12px system-ui", "rgba(203,213,225,0.8)", "center");
    const m1: UIButton = { key: "m1", label: s.onePlayer, x: cx - bw - 6, y: top + 172, w: bw, h: 44, active: this.mode === "1p" };
    const m2: UIButton = { key: "m2", label: s.twoPlayers, x: cx + 6, y: top + 172, w: bw, h: 44, active: this.mode === "2p" };

    const start: UIButton = { key: "start", label: s.startGame, x: cx - cw / 2 + 30, y: top + ch - 56, w: cw - 60, h: 46 };

    this.buttons.push(v8, v9, m1, m2, start);
    r.drawButton(v8);
    r.drawButton(v9);
    r.drawButton(m1);
    r.drawButton(m2);
    r.drawButton(start, true);
  }

  private drawGameOver(W: number, H: number): void {
    const r = this.renderer!;
    r.dim(0.62);
    const cw = Math.min(W - 40, 320);
    const ch = 190;
    const cx = W / 2;
    const top = H / 2 - ch / 2;
    r.panel(cx - cw / 2, top, cw, ch, 0.92);

    const s = this.s;
    const youWin = this.mode === "1p" ? this.winner === 0 : false;
    const title = this.mode === "1p"
      ? (this.winner === 0 ? s.youWin : s.cpuWins)
      : fmt(s.playerWins, { n: (this.winner ?? 0) + 1 });
    r.text(title, cx, top + 46, "800 24px system-ui", youWin || this.mode === "2p" ? "#86efac" : "#fca5a5", "center");
    r.text(this.variant === "8ball" ? s.eightBall : s.nineBall, cx, top + 78, "500 13px system-ui", "rgba(203,213,225,0.8)", "center");

    const again: UIButton = { key: "again", label: s.playAgain, x: cx - cw / 2 + 24, y: top + ch - 58, w: (cw - 60) / 2, h: 44 };
    const menu: UIButton = { key: "menu", label: s.menu, x: cx + 6, y: top + ch - 58, w: (cw - 60) / 2, h: 44 };
    this.buttons.push(again, menu);
    r.drawButton(again, true);
    r.drawButton(menu);
  }
}
