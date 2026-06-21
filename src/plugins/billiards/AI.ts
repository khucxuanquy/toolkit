import type { Ball } from "./entities/Ball";
import { BALL_R } from "./entities/Ball";
import type { GameVariant, Group, Vec2 } from "./types";
import { POCKETS, PLAY_W, PLAY_H, CUSHION, HEAD_SPOT } from "./Table";
import { dist, norm, sub, add, scale, pointSegDist } from "./utils/math";

export interface AIPlan {
  /** If set, place the cue ball here first (ball-in-hand). */
  cuePos: Vec2 | null;
  angle: number;
  power: number;
  spinX: number;
  spinY: number;
}

interface Candidate {
  angle: number;
  power: number;
  score: number;
  cuePos: Vec2;
}

/**
 * Basic single-player AI. Enumerates legal target balls × pockets, keeps shots
 * with a clear cue→ghost and ball→pocket path and a workable cut angle, then
 * picks the highest-scoring one. Adds a little aim noise for human-like play.
 */
export function planShot(
  balls: Ball[],
  variant: GameVariant,
  myGroup: Group,
  open: boolean,
  ballInHand: boolean,
): AIPlan {
  const cue = balls[0];
  const live = balls.filter((b) => !b.pocketed && !b.isCue);
  const targets = legalTargets(live, variant, myGroup, open);

  const cuePositions: Vec2[] = ballInHand
    ? candidateCuePositions(balls)
    : [{ x: cue.pos.x, y: cue.pos.y }];

  let best: Candidate | null = null;

  for (const cuePos of cuePositions) {
    for (const target of targets) {
      for (const pocket of POCKETS) {
        const cand = evaluateShot(cuePos, target, pocket.pos, balls);
        if (cand && (!best || cand.score > best.score)) best = cand;
      }
    }
  }

  if (!best) {
    // No makeable shot — nudge the lowest/legal target toward nearest pocket.
    const t = targets[0] ?? live[0];
    const from = cuePositions[0];
    const angle = t ? Math.atan2(t.pos.y - from.y, t.pos.x - from.x) : 0;
    return {
      cuePos: ballInHand ? from : null,
      angle,
      power: 0.5,
      spinX: 0,
      spinY: 0,
    };
  }

  // Human-like aim error: smaller when closer/easier.
  const noise = (Math.random() - 0.5) * 0.05;
  return {
    cuePos: ballInHand ? best.cuePos : null,
    angle: best.angle + noise,
    power: best.power,
    spinX: 0,
    spinY: 0,
  };
}

function legalTargets(live: Ball[], variant: GameVariant, myGroup: Group, open: boolean): Ball[] {
  if (variant === "9ball") {
    const lowest = Math.min(...live.map((b) => b.num));
    return live.filter((b) => b.num === lowest);
  }
  // 8-ball
  if (open || !myGroup) {
    return live.filter((b) => b.num !== 8);
  }
  const groupBalls = live.filter((b) =>
    myGroup === "solids" ? b.num >= 1 && b.num <= 7 : b.num >= 9 && b.num <= 15,
  );
  if (groupBalls.length > 0) return groupBalls;
  return live.filter((b) => b.num === 8); // group cleared → on the 8
}

function evaluateShot(cuePos: Vec2, target: Ball, pocket: Vec2, balls: Ball[]): Candidate | null {
  const toPocket = norm(sub(pocket, target.pos));
  // Ghost-ball position: cue ball centre at contact.
  const ghost = sub(target.pos, scale(toPocket, BALL_R * 2));
  const toGhost = norm(sub(ghost, cuePos));

  // Cut angle quality: cue approach vs target→pocket line.
  const cut = toGhost.x * toPocket.x + toGhost.y * toPocket.y;
  if (cut < 0.25) return null; // too thin to make reliably

  // Path clearance.
  if (!pathClear(cuePos, ghost, balls, [target.num, 0])) return null;
  if (!pathClear(target.pos, pocket, balls, [target.num])) return null;

  const cueDist = dist(cuePos, ghost);
  const potDist = dist(target.pos, pocket);

  // Score: prefer straight cuts, shorter distances.
  const score = cut * 2.2 - (cueDist + potDist) / 900;

  // Power scales with total travel, with headroom.
  const power = Math.min(0.95, 0.34 + (cueDist + potDist) / 1700);

  const angle = Math.atan2(ghost.y - cuePos.y, ghost.x - cuePos.x);
  return { angle, power, score, cuePos };
}

/** True if no other ball blocks the segment a→b (ignoring `ignore` numbers). */
function pathClear(a: Vec2, b: Vec2, balls: Ball[], ignore: number[]): boolean {
  for (const ball of balls) {
    if (ball.pocketed || ignore.includes(ball.num)) continue;
    if (pointSegDist(ball.pos, a, b) < BALL_R * 2 - 1) return false;
  }
  return true;
}

/** A handful of cue placements to try when the AI has ball-in-hand. */
function candidateCuePositions(balls: Ball[]): Vec2[] {
  const spots: Vec2[] = [
    { x: HEAD_SPOT.x, y: HEAD_SPOT.y },
    { x: PLAY_W * 0.5, y: PLAY_H * 0.5 },
    { x: PLAY_W * 0.5, y: PLAY_H * 0.25 },
    { x: PLAY_W * 0.5, y: PLAY_H * 0.75 },
    { x: PLAY_W * 0.7, y: PLAY_H * 0.5 },
    { x: PLAY_W * 0.3, y: PLAY_H * 0.3 },
  ];
  return spots.filter((s) => isFree(s, balls));
}

function isFree(p: Vec2, balls: Ball[]): boolean {
  for (const b of balls) {
    if (b.pocketed || b.isCue) continue;
    if (dist(p, b.pos) < BALL_R * 2.2) return false;
  }
  return true;
}

/** Resolve a free cue-ball spot near `p`, spiralling out if blocked. */
export function findFreeSpot(p: Vec2, balls: Ball[]): Vec2 {
  if (isFree(p, balls)) return clampToTable(p);
  for (let r = BALL_R * 2; r < 300; r += BALL_R) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      const cand = add(p, { x: Math.cos(ang) * r, y: Math.sin(ang) * r });
      if (isFree(cand, balls)) return clampToTable(cand);
    }
  }
  return clampToTable(p);
}

function clampToTable(p: Vec2): Vec2 {
  return {
    x: Math.max(CUSHION + BALL_R, Math.min(PLAY_W - CUSHION - BALL_R, p.x)),
    y: Math.max(CUSHION + BALL_R, Math.min(PLAY_H - CUSHION - BALL_R, p.y)),
  };
}
