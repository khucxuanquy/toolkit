"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { flappyStorage } from "./storage";

/* ---- Virtual play-field (logical pixels; canvas is scaled to fit) ---- */
const W = 360;
const H = 560;
const GROUND_H = 84;
const PLAY_H = H - GROUND_H;

const BIRD_X = 96;
const BIRD_R = 14;

const GRAVITY = 1500; // px / s²
const FLAP_V = -380; // px / s (upward impulse)
const MAX_FALL = 520; // terminal velocity

const PIPE_W = 60;
const PIPE_GAP = 152;
const PIPE_SPEED = 145; // px / s
const PIPE_DX = 212; // horizontal distance between pipes
const GAP_MARGIN = 40; // keep the gap away from ceiling / ground

type Phase = "ready" | "playing" | "over";

interface Pipe {
  x: number;
  gapY: number; // centre of the gap
  scored: boolean;
}

interface World {
  birdY: number;
  birdV: number;
  pipes: Pipe[];
  distSinceSpawn: number;
  score: number;
  t: number; // elapsed seconds (drives idle bob)
}

const READY_Y = PLAY_H * 0.45;

function freshWorld(): World {
  return {
    birdY: READY_Y,
    birdV: 0,
    pipes: [],
    distSinceSpawn: PIPE_DX, // spawn the first pipe immediately (full screen away)
    score: 0,
    t: 0,
  };
}

function randomGapY(): number {
  const min = GAP_MARGIN + PIPE_GAP / 2;
  const max = PLAY_H - GAP_MARGIN - PIPE_GAP / 2;
  return min + Math.random() * (max - min);
}

/* -------------------------------- Drawing -------------------------------- */
function draw(ctx: CanvasRenderingContext2D, w: World, phase: Phase) {
  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, PLAY_H);
  sky.addColorStop(0, "#4ec0ca");
  sky.addColorStop(1, "#8fe3d6");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Pipes
  for (const p of w.pipes) {
    const gapTop = p.gapY - PIPE_GAP / 2;
    const gapBottom = p.gapY + PIPE_GAP / 2;
    drawPipe(ctx, p.x, 0, gapTop, true);
    drawPipe(ctx, p.x, gapBottom, PLAY_H - gapBottom, false);
  }

  // Ground
  ctx.fillStyle = "#ded895";
  ctx.fillRect(0, PLAY_H, W, GROUND_H);
  ctx.fillStyle = "#5ec23e";
  ctx.fillRect(0, PLAY_H, W, 14);
  ctx.fillStyle = "#4ba32f";
  ctx.fillRect(0, PLAY_H + 14, W, 4);

  // Bird (tilts with vertical velocity)
  const angle = Math.max(-0.5, Math.min(1.1, w.birdV / 520));
  ctx.save();
  ctx.translate(BIRD_X, w.birdY);
  ctx.rotate(angle);

  // body
  ctx.fillStyle = "#ffd233";
  ctx.beginPath();
  ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#e1a900";
  ctx.stroke();
  // wing
  ctx.fillStyle = "#fff4cc";
  ctx.beginPath();
  ctx.ellipse(-3, 3, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(6, -5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#222";
  ctx.beginPath();
  ctx.arc(7.5, -5, 2, 0, Math.PI * 2);
  ctx.fill();
  // beak
  ctx.fillStyle = "#ff8c1a";
  ctx.beginPath();
  ctx.moveTo(BIRD_R - 2, -2);
  ctx.lineTo(BIRD_R + 8, 1);
  ctx.lineTo(BIRD_R - 2, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  void phase;
}

function drawPipe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  isTop: boolean,
) {
  if (height <= 0) return;
  ctx.fillStyle = "#5ec23e";
  ctx.fillRect(x, y, PIPE_W, height);
  ctx.fillStyle = "#4ba32f";
  ctx.fillRect(x + PIPE_W - 8, y, 8, height); // shaded edge
  ctx.fillStyle = "#74d850";
  ctx.fillRect(x + 4, y, 6, height); // highlight
  // lip
  const lipH = 18;
  const lipY = isTop ? y + height - lipH : y;
  ctx.fillStyle = "#5ec23e";
  ctx.fillRect(x - 3, lipY, PIPE_W + 6, lipH);
  ctx.strokeStyle = "#3f8a28";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 3, lipY, PIPE_W + 6, lipH);
}

/* ------------------------------- Component ------------------------------- */
export default function FlappyBirdPage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef<World>(freshWorld());
  const phaseRef = useRef<Phase>("ready");

  const [phase, setPhaseState] = useState<Phase>("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Size the canvas backing store for crisp rendering on HiDPI screens.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
    draw(ctx, worldRef.current, phaseRef.current);
  }, []);

  // Load best score (async dispatch — no synchronous setState in effect body).
  useEffect(() => {
    let active = true;
    void flappyStorage.loadBest().then((b) => {
      if (active) setBest((prev) => Math.max(prev, b));
    });
    return () => {
      active = false;
    };
  }, []);

  // Persist best score whenever it improves.
  useEffect(() => {
    if (best > 0) void flappyStorage.saveBest(best);
  }, [best]);

  const start = useCallback(() => {
    worldRef.current = freshWorld();
    worldRef.current.birdV = FLAP_V;
    setScore(0);
    setPhase("playing");
  }, [setPhase]);

  const flap = useCallback(() => {
    const p = phaseRef.current;
    if (p === "playing") {
      worldRef.current.birdV = FLAP_V;
      sound.flap();
    } else {
      // From "ready" or "over": (re)start the run.
      start();
    }
  }, [start]);

  // Keyboard: Space / ArrowUp flaps.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flap]);

  // Game loop. Re-created per phase; "over" draws one static frame and stops.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (phase === "over") {
      draw(ctx, worldRef.current, phase);
      return;
    }

    let raf = 0;
    let last = 0;
    const loop = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      const w = worldRef.current;
      w.t += dt;

      if (phase === "ready") {
        // Gentle idle bob while waiting for the first tap.
        w.birdY = READY_Y + Math.sin(w.t * 3) * 8;
      } else {
        // Physics
        w.birdV = Math.min(w.birdV + GRAVITY * dt, MAX_FALL);
        w.birdY += w.birdV * dt;

        // Spawn pipes by travelled distance.
        w.distSinceSpawn += PIPE_SPEED * dt;
        if (w.distSinceSpawn >= PIPE_DX) {
          w.distSinceSpawn -= PIPE_DX;
          w.pipes.push({ x: W, gapY: randomGapY(), scored: false });
        }

        // Move pipes, score, cull off-screen.
        for (const p of w.pipes) {
          p.x -= PIPE_SPEED * dt;
          if (!p.scored && p.x + PIPE_W < BIRD_X) {
            p.scored = true;
            w.score += 1;
            setScore(w.score);
            sound.tick();
          }
        }
        w.pipes = w.pipes.filter((p) => p.x + PIPE_W > -4);

        // Ceiling clamp (not fatal, classic behaviour).
        if (w.birdY < BIRD_R) {
          w.birdY = BIRD_R;
          w.birdV = 0;
        }

        // Death: ground or pipe collision.
        let dead = w.birdY + BIRD_R >= PLAY_H;
        if (!dead) {
          for (const p of w.pipes) {
            const inX = BIRD_X + BIRD_R > p.x && BIRD_X - BIRD_R < p.x + PIPE_W;
            if (!inX) continue;
            const gapTop = p.gapY - PIPE_GAP / 2;
            const gapBottom = p.gapY + PIPE_GAP / 2;
            if (w.birdY - BIRD_R < gapTop || w.birdY + BIRD_R > gapBottom) {
              dead = true;
              break;
            }
          }
        }

        if (dead) {
          w.birdY = Math.min(w.birdY, PLAY_H - BIRD_R);
          draw(ctx, w, "over");
          setBest((b) => Math.max(b, w.score));
          setPhase("over");
          sound.lose();
          return; // stop scheduling
        }
      }

      draw(ctx, w, phase);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, setPhase]);

  const isNewBest = phase === "over" && score > 0 && score >= best;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Stat label={t("fb.score")} value={score} />
          <Stat label={t("fb.best")} value={best} />
        </div>
        <Button variant="outline" size="sm" onClick={start}>
          <Icon name="RotateCcw" size={15} /> {t("fb.restart")}
        </Button>
      </div>

      <div
        className="relative mx-auto w-full cursor-pointer touch-none overflow-hidden rounded-2xl shadow-lg select-none"
        style={{ maxWidth: W }}
        onPointerDown={(e) => {
          e.preventDefault();
          flap();
        }}
        role="button"
        tabIndex={0}
        aria-label={t("fb.howto")}
      >
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          style={{ aspectRatio: `${W} / ${H}` }}
        />

        {phase === "ready" && (
          <Overlay>
            <Icon name="Bird" size={44} className="text-yellow-300" />
            <p className="text-lg font-semibold">{t("fb.tapToStart")}</p>
          </Overlay>
        )}

        {phase === "over" && (
          <Overlay>
            <p className="text-2xl font-bold">{t("fb.over")}</p>
            {isNewBest && <p className="font-semibold text-yellow-300">🏆 {t("fb.newBest")}</p>}
            <div className="text-center">
              <div className="text-sm opacity-80">{t("fb.score")}</div>
              <div className="text-4xl font-extrabold tabular-nums">{score}</div>
            </div>
            <Button onClick={start}>
              <Icon name="RotateCcw" size={16} /> {t("fb.restart")}
            </Button>
          </Overlay>
        )}

        {phase === "playing" && (
          <div className="pointer-events-none absolute inset-x-0 top-4 text-center">
            <span className="text-4xl font-extrabold text-white tabular-nums drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]">
              {score}
            </span>
          </div>
        )}
      </div>

      <p className="text-muted text-center text-sm">{t("fb.howto")}</p>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 text-white backdrop-blur-[2px]">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface-2 min-w-20 rounded-xl px-3 py-1.5 text-center">
      <div className="text-muted text-xs tracking-wide uppercase">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
