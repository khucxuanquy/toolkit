import { Ball, BALL_R } from "./entities/Ball";
import type { GameVariant } from "./types";
import { FOOT_SPOT, HEAD_SPOT } from "./Table";

const GAP = BALL_R * 2 + 0.5; // touching, tiny breathing room
const ROW_DX = GAP * Math.cos(Math.PI / 6); // horizontal step between rows

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Build a fresh rack for the variant. Index 0 is always the cue ball. */
export function buildRack(variant: GameVariant): Ball[] {
  return variant === "9ball" ? rack9() : rack8();
}

/** 8-ball: 15-ball triangle, 8 in the centre, corners mixed. */
function rack8(): Ball[] {
  const balls: Ball[] = [new Ball(0, HEAD_SPOT.x, HEAD_SPOT.y)];

  // Positions in a 5-row triangle, apex at the foot spot.
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < 5; row++) {
    const x = FOOT_SPOT.x + row * ROW_DX;
    for (let k = 0; k <= row; k++) {
      const y = FOOT_SPOT.y + (k - row / 2) * GAP;
      positions.push({ x, y });
    }
  }

  // Standard-ish constraints: 8 in centre (row 2, middle), back corners one of
  // each group, apex any. Fill the rest randomly but balanced.
  const solids = shuffle([1, 2, 3, 4, 5, 6, 7]);
  const stripes = shuffle([9, 10, 11, 12, 13, 14, 15]);

  // index map of triangle (row,k) → positions index
  // rows sizes: 1,2,3,4,5 → centre of row2 is positions[3+1]=index 4
  const order: number[] = new Array(15).fill(0);
  const CENTER = 4; // 8 ball
  const BACK_LEFT = 10; // first of last row
  const BACK_RIGHT = 14; // last of last row

  order[CENTER] = 8;
  order[BACK_LEFT] = solids.pop()!;
  order[BACK_RIGHT] = stripes.pop()!;

  const rest = shuffle([...solids, ...stripes]);
  for (let i = 0; i < order.length; i++) {
    if (i === CENTER || i === BACK_LEFT || i === BACK_RIGHT) continue;
    order[i] = rest.pop()!;
  }

  for (let i = 0; i < positions.length; i++) {
    balls.push(new Ball(order[i], positions[i].x, positions[i].y));
  }
  return balls;
}

/** 9-ball: diamond of 1–9, 1 at apex, 9 in the centre. */
function rack9(): Ball[] {
  const balls: Ball[] = [new Ball(0, HEAD_SPOT.x, HEAD_SPOT.y)];

  // Diamond rows: 1,2,3,2,1
  const rowSizes = [1, 2, 3, 2, 1];
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < rowSizes.length; row++) {
    const n = rowSizes[row];
    const x = FOOT_SPOT.x + row * ROW_DX;
    for (let k = 0; k < n; k++) {
      const y = FOOT_SPOT.y + (k - (n - 1) / 2) * GAP;
      positions.push({ x, y });
    }
  }
  // positions order: [apex, r1a,r1b, r2a,r2b,r2c, r3a,r3b, r4]
  // apex = index 0 → 1 ball; centre of middle row = index 4 → 9 ball.
  const APEX = 0;
  const CENTER = 4;
  const order: number[] = new Array(9).fill(0);
  order[APEX] = 1;
  order[CENTER] = 9;
  const rest = shuffle([2, 3, 4, 5, 6, 7, 8]);
  for (let i = 0; i < order.length; i++) {
    if (i === APEX || i === CENTER) continue;
    order[i] = rest.pop()!;
  }
  for (let i = 0; i < positions.length; i++) {
    balls.push(new Ball(order[i], positions[i].x, positions[i].y));
  }
  return balls;
}
