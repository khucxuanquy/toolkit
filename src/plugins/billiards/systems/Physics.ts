import type { Ball } from "../entities/Ball";
import { BALL_R } from "../entities/Ball";
import type { PhysEvent, Vec2 } from "../types";
import {
  PLAY_W,
  PLAY_H,
  CUSHION,
  POCKETS,
  POCKET_CAPTURE,
  inHorizontalGap,
  inVerticalGap,
} from "../Table";
import { norm, rotateOrient } from "../utils/math";

// Tunables (logical units / second).
export const MAX_SHOT_SPEED = 1650;
// Friction blends a velocity-proportional (viscous) term for a smooth, natural
// ease-out with a small constant rolling resistance so balls glide and settle
// gently instead of decelerating stiffly.
const VISCOUS = 0.62; // per-second proportional drag (gentle, long glide)
const ROLL_FRICTION = 42; // constant rolling deceleration
const STOP_SPEED = 4; // below this a ball is parked
const CUSHION_E = 0.9; // cushion restitution
const BALL_E = 0.96; // ball-ball restitution
/** Fixed physics timestep (240 Hz) — frame-rate-independent, smooth motion. */
export const FIXED_DT = 1 / 240;
const SPIN_FOLLOW = 0.62; // follow/draw strength
const SPIN_SIDE = 0.34; // side (throw) strength

const D = BALL_R * 2;
const D2 = D * D;

/**
 * Advance the table by one fixed timestep. The caller drives this from a
 * fixed-step accumulator so motion is smooth and identical at any frame rate.
 * Pushes audio/scoring events into `events`. Returns true while a ball moves.
 */
export function stepFixed(balls: Ball[], events: PhysEvent[]): boolean {
  integrate(balls, FIXED_DT);
  resolveBallCollisions(balls, events);
  resolveCushions(balls, events);
  resolvePockets(balls, events);

  let moving = false;
  for (const b of balls) if (!b.pocketed && b.speed > 0) moving = true;
  return moving;
}

function integrate(balls: Ball[], h: number): void {
  for (const b of balls) {
    if (b.pocketed) continue;
    const sp = b.speed;
    if (sp <= 0) continue;
    // Viscous (proportional) + constant rolling resistance → graceful ease-out.
    const ns = sp * (1 - VISCOUS * h) - ROLL_FRICTION * h;
    if (ns <= STOP_SPEED) {
      b.stop();
      continue;
    }
    const k = ns / sp;
    b.vel.x *= k;
    b.vel.y *= k;
    b.pos.x += b.vel.x * h;
    b.pos.y += b.vel.y * h;

    // Roll the surface: rotate about the in-plane axis ⟂ to travel, by
    // (distance / radius). Makes the markings tumble like a real rolling ball.
    const vlen = Math.hypot(b.vel.x, b.vel.y);
    if (vlen > 1) {
      rotateOrient(b.orient, -b.vel.y / vlen, b.vel.x / vlen, 0, (ns * h) / BALL_R);
    }
  }
}

function resolveBallCollisions(balls: Ball[], events: PhysEvent[]): void {
  for (let i = 0; i < balls.length; i++) {
    const a = balls[i];
    if (a.pocketed) continue;
    for (let j = i + 1; j < balls.length; j++) {
      const b = balls[j];
      if (b.pocketed) continue;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d2 = dx * dx + dy * dy;
      if (d2 >= D2 || d2 < 1e-9) continue;

      const dlen = Math.sqrt(d2);
      const nx = dx / dlen;
      const ny = dy / dlen;

      // Positional separation.
      const overlap = D - dlen;
      const half = overlap / 2;
      a.pos.x -= nx * half;
      a.pos.y -= ny * half;
      b.pos.x += nx * half;
      b.pos.y += ny * half;

      // Capture cue travel direction before resolving (for spin).
      const cue = a.isCue ? a : b.isCue ? b : null;
      const cueDir: Vec2 | null = cue && cue.spinPending ? norm(cue.vel) : null;

      // Relative velocity along the normal (a→b).
      const rvn = (a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * ny;
      if (rvn > 0) {
        const jimp = ((1 + BALL_E) / 2) * rvn; // equal masses
        a.vel.x -= jimp * nx;
        a.vel.y -= jimp * ny;
        b.vel.x += jimp * nx;
        b.vel.y += jimp * ny;

        events.push({
          type: "ball",
          a: a.num,
          b: b.num,
          strength: Math.min(1, rvn / 1400),
          pos: { x: a.pos.x + nx * BALL_R, y: a.pos.y + ny * BALL_R },
        });

        // Apply cue English on its first object-ball contact.
        if (cue && cue.spinPending && cueDir) {
          const speed = Math.hypot(cue.vel.x, cue.vel.y) + Math.abs(rvn);
          const px = -cueDir.y; // perpendicular to travel
          const py = cueDir.x;
          // follow (+) / draw (-)
          cue.vel.x += cueDir.x * cue.spinY * SPIN_FOLLOW * speed;
          cue.vel.y += cueDir.y * cue.spinY * SPIN_FOLLOW * speed;
          // side spin throw
          cue.vel.x += px * cue.spinX * SPIN_SIDE * speed;
          cue.vel.y += py * cue.spinX * SPIN_SIDE * speed;
          cue.spinPending = false;
        }
      }
    }
  }
}

function resolveCushions(balls: Ball[], events: PhysEvent[]): void {
  // Balls bounce off the cushion nose (inset by CUSHION) so they rest against
  // the bumper instead of overlapping the green felt edge.
  const minX = CUSHION + BALL_R;
  const maxX = PLAY_W - CUSHION - BALL_R;
  const minY = CUSHION + BALL_R;
  const maxY = PLAY_H - CUSHION - BALL_R;

  for (const b of balls) {
    if (b.pocketed) continue;
    let hit = 0;

    // Left / right rails (vertical), skipped at pocket gaps.
    if (b.pos.x < minX && !inVerticalGap(b.pos.y)) {
      b.pos.x = minX;
      b.vel.x = Math.abs(b.vel.x) * CUSHION_E;
      hit = Math.max(hit, Math.abs(b.vel.x));
    } else if (b.pos.x > maxX && !inVerticalGap(b.pos.y)) {
      b.pos.x = maxX;
      b.vel.x = -Math.abs(b.vel.x) * CUSHION_E;
      hit = Math.max(hit, Math.abs(b.vel.x));
    }

    // Top / bottom rails (horizontal), skipped at pocket gaps.
    if (b.pos.y < minY && !inHorizontalGap(b.pos.x)) {
      b.pos.y = minY;
      b.vel.y = Math.abs(b.vel.y) * CUSHION_E;
      hit = Math.max(hit, Math.abs(b.vel.y));
    } else if (b.pos.y > maxY && !inHorizontalGap(b.pos.x)) {
      b.pos.y = maxY;
      b.vel.y = -Math.abs(b.vel.y) * CUSHION_E;
      hit = Math.max(hit, Math.abs(b.vel.y));
    }

    if (hit > 40) {
      events.push({ type: "cushion", strength: Math.min(1, hit / 1400), pos: { x: b.pos.x, y: b.pos.y } });
    }
  }
}

function resolvePockets(balls: Ball[], events: PhysEvent[]): void {
  for (const b of balls) {
    if (b.pocketed) continue;
    for (const p of POCKETS) {
      const dx = b.pos.x - p.pos.x;
      const dy = b.pos.y - p.pos.y;
      if (dx * dx + dy * dy <= POCKET_CAPTURE * POCKET_CAPTURE) {
        b.pocketed = true;
        b.sinking = true;
        b.sinkT = 0;
        b.sinkAt = { x: p.pos.x, y: p.pos.y };
        b.stop();
        events.push({ type: "pocket", a: b.num, strength: 1, pos: { x: p.pos.x, y: p.pos.y } });
        break;
      }
    }
  }
}
