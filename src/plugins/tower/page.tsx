"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon, Tabs } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { reportScore } from "@/core/firebase/realtime";
import { GameLeaderboard } from "@/shared/components/GameLeaderboard";
import { towerStorage, type BestScores, type Difficulty } from "./storage";

/* ---- Virtual play-field (logical pixels; canvas is scaled to fit) ---- */
const W = 360;
const H = 560;
const BLOCK_H = 32;
const BASE_W = 200;
const BOTTOM_Y = H - 36; // baseline the tower sits on
const TARGET_Y = H * 0.3; // where the active block should hover once we scroll
const PERFECT_TOL = 4; // px tolerance that counts as a perfect drop
const GRAVITY = 1400; // px / s² for falling debris

const SPEEDS: Record<Difficulty, number> = { easy: 120, medium: 175, hard: 240 };
const SPEED_RAMP = 2; // +px/s per placed block
const SPEED_RAMP_CAP = 120;

type Phase = "ready" | "playing" | "over";

interface Block {
  x: number; // left edge
  w: number;
  hue: number;
}
interface Moving extends Block {
  dir: 1 | -1;
}
interface Debris {
  x: number;
  y: number; // screen-space top
  w: number;
  vy: number;
  hue: number;
}
interface World {
  blocks: Block[];
  moving: Moving;
  debris: Debris[];
  cam: number;
  perfect: boolean;
}

const BASE_HUE = 205;
const hueFor = (level: number) => (BASE_HUE + level * 18) % 360;

const topY = (level: number, cam: number) => BOTTOM_Y - (level + 1) * BLOCK_H + cam;
const camTarget = (movingLevel: number) =>
  Math.max(0, TARGET_Y - BOTTOM_Y + (movingLevel + 1) * BLOCK_H);

function freshWorld(): World {
  const base: Block = { x: (W - BASE_W) / 2, w: BASE_W, hue: hueFor(0) };
  return {
    blocks: [base],
    moving: { x: 0, w: BASE_W, dir: 1, hue: hueFor(1) },
    debris: [],
    cam: 0,
    perfect: false,
  };
}

function speedFor(diff: Difficulty, placed: number) {
  return SPEEDS[diff] + Math.min(placed * SPEED_RAMP, SPEED_RAMP_CAP);
}

/* -------------------------------- Drawing -------------------------------- */
function roundedTop(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  hue: number,
  light = false,
) {
  ctx.fillStyle = `hsl(${hue} 70% ${light ? 62 : 52}%)`;
  ctx.fillRect(x, y, w, BLOCK_H);
  // top highlight strip
  ctx.fillStyle = `hsl(${hue} 70% 70%)`;
  ctx.fillRect(x, y, w, 5);
  // bottom shade
  ctx.fillStyle = `hsl(${hue} 70% 42%)`;
  ctx.fillRect(x, y + BLOCK_H - 4, w, 4);
}

function draw(ctx: CanvasRenderingContext2D, world: World, phase: Phase) {
  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#15233f");
  bg.addColorStop(1, "#0b1220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Placed blocks
  world.blocks.forEach((b, i) => {
    const y = topY(i, world.cam);
    if (y > H || y + BLOCK_H < 0) return;
    roundedTop(ctx, b.x, y, b.w, b.hue);
  });

  // Debris (sliced overhangs falling away)
  for (const d of world.debris) {
    ctx.fillStyle = `hsl(${d.hue} 70% 52%)`;
    ctx.fillRect(d.x, d.y, d.w, BLOCK_H);
  }

  // Active moving block
  if (phase !== "over") {
    const m = world.moving;
    const y = topY(world.blocks.length, world.cam);
    roundedTop(ctx, m.x, y, m.w, m.hue, true);
  }
}

/* ------------------------------- Component ------------------------------- */
export default function TowerPage() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const worldRef = useRef<World>(freshWorld());
  const phaseRef = useRef<Phase>("ready");
  const diffRef = useRef<Difficulty>("medium");

  const [phase, setPhaseState] = useState<Phase>("ready");
  const [difficulty, setDifficultyState] = useState<Difficulty>("medium");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState<BestScores>({ easy: 0, medium: 0, hard: 0 });

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  // Size the canvas backing store for crisp HiDPI rendering.
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

  // Load best scores (async dispatch — no synchronous setState in effect body).
  useEffect(() => {
    let active = true;
    void towerStorage.loadBest().then((b) => {
      if (active) setBest(b);
    });
    return () => {
      active = false;
    };
  }, []);

  const start = useCallback(() => {
    worldRef.current = freshWorld();
    setScore(0);
    setPhase("ready");
  }, [setPhase]);

  const drop = useCallback(() => {
    const w = worldRef.current;
    const m = w.moving;
    const below = w.blocks[w.blocks.length - 1];

    let left = Math.max(m.x, below.x);
    let right = Math.min(m.x + m.w, below.x + below.w);
    let overlap = right - left;

    const movingScreenY = topY(w.blocks.length, w.cam);

    if (overlap <= 0) {
      // Total miss — the whole block tumbles away.
      w.debris.push({ x: m.x, y: movingScreenY, w: m.w, vy: -40, hue: m.hue });
      const finalScore = w.blocks.length - 1;
      setBest((prev) => {
        const next = { ...prev, [diffRef.current]: Math.max(prev[diffRef.current], finalScore) };
        void towerStorage.saveBest(next);
        return next;
      });
      reportScore("tower", finalScore);
      setPhase("over");
      sound.lose();
      return;
    }

    const perfect = Math.abs(m.x - below.x) <= PERFECT_TOL;
    if (perfect) {
      left = below.x;
      right = below.x + below.w;
      overlap = below.w;
    } else {
      // Slice off the overhang as falling debris.
      if (m.x < left) w.debris.push({ x: m.x, y: movingScreenY, w: left - m.x, vy: 0, hue: m.hue });
      if (m.x + m.w > right)
        w.debris.push({ x: right, y: movingScreenY, w: m.x + m.w - right, vy: 0, hue: m.hue });
    }
    w.perfect = perfect;

    const placed: Block = { x: left, w: overlap, hue: m.hue };
    w.blocks.push(placed);
    setScore(w.blocks.length - 1);
    if (perfect) sound.match();
    else sound.place();

    // Next block enters from the alternating side.
    const fromLeft = w.blocks.length % 2 === 0;
    w.moving = {
      x: fromLeft ? 0 : W - placed.w,
      w: placed.w,
      dir: fromLeft ? 1 : -1,
      hue: hueFor(w.blocks.length),
    };

    if (phaseRef.current === "ready") setPhase("playing");
  }, [setPhase]);

  const onAction = useCallback(() => {
    if (phaseRef.current === "over") start();
    else drop();
  }, [drop, start]);

  const changeDifficulty = useCallback(
    (d: Difficulty) => {
      diffRef.current = d;
      setDifficultyState(d);
      start();
    },
    [start],
  );

  // Keyboard: Space / ArrowDown drops the block.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowDown") {
        e.preventDefault();
        onAction();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAction]);

  // Game loop. Re-created per phase; "over" keeps animating only the debris.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    const loop = (time: number) => {
      const dt = last ? Math.min((time - last) / 1000, 0.05) : 0;
      last = time;
      const w = worldRef.current;

      // Slide the active block while the game is live.
      if (phase !== "over") {
        const m = w.moving;
        const speed = speedFor(diffRef.current, w.blocks.length - 1);
        m.x += m.dir * speed * dt;
        if (m.x <= 0) {
          m.x = 0;
          m.dir = 1;
        } else if (m.x + m.w >= W) {
          m.x = W - m.w;
          m.dir = -1;
        }
      }

      // Smoothly follow the top of the tower.
      const target = camTarget(w.blocks.length);
      w.cam += (target - w.cam) * Math.min(1, dt * 10);

      // Falling debris.
      if (w.debris.length) {
        for (const d of w.debris) {
          d.vy += GRAVITY * dt;
          d.y += d.vy * dt;
        }
        w.debris = w.debris.filter((d) => d.y < H + BLOCK_H);
      }

      draw(ctx, w, phase);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const currentBest = best[difficulty];
  const isNewBest = phase === "over" && score > 0 && score >= currentBest;

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="flex justify-center">
        <Tabs<Difficulty>
          items={[
            { value: "easy", label: t("tw.easy") },
            { value: "medium", label: t("tw.medium") },
            { value: "hard", label: t("tw.hard") },
          ]}
          value={difficulty}
          onChange={changeDifficulty}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Stat label={t("tw.score")} value={score} />
          <Stat label={t("tw.best")} value={currentBest} />
        </div>
        <Button variant="outline" size="sm" onClick={start}>
          <Icon name="RotateCcw" size={15} /> {t("tw.restart")}
        </Button>
      </div>

      <div
        className="relative mx-auto w-full cursor-pointer touch-none overflow-hidden rounded-2xl shadow-lg select-none"
        style={{ maxWidth: W }}
        onPointerDown={(e) => {
          e.preventDefault();
          onAction();
        }}
        role="button"
        tabIndex={0}
        aria-label={t("tw.howto")}
      >
        <canvas
          ref={canvasRef}
          className="block h-auto w-full"
          style={{ aspectRatio: `${W} / ${H}` }}
        />

        {phase === "ready" && (
          <Overlay>
            <Icon name="Blocks" size={44} className="text-sky-300" />
            <p className="text-center text-lg font-semibold">{t("tw.tapToStart")}</p>
          </Overlay>
        )}

        {phase === "over" && (
          <Overlay>
            <p className="text-2xl font-bold">{t("tw.over")}</p>
            {isNewBest && <p className="font-semibold text-yellow-300">🏆 {t("tw.newBest")}</p>}
            <div className="text-center">
              <div className="text-sm opacity-80">{t("tw.score")}</div>
              <div className="text-4xl font-extrabold tabular-nums">{score}</div>
            </div>
            <Button onClick={start}>
              <Icon name="RotateCcw" size={16} /> {t("tw.restart")}
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

      <p className="text-muted text-center text-sm">{t("tw.howto")}</p>

      <GameLeaderboard game="tower" />
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/45 px-4 text-white backdrop-blur-[2px]">
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
