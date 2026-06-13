"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";

type Vec3 = [number, number, number];

/* ---- Cube geometry (unit half-size 1) ---- */
interface FaceDef {
  value: number;
  normal: Vec3;
  right: Vec3;
  up: Vec3;
}
const FACES: FaceDef[] = [
  { value: 1, normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, 1] }, // +Y top
  { value: 6, normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, -1] }, // -Y bottom
  { value: 3, normal: [1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] }, // +X
  { value: 4, normal: [-1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] }, // -X
  { value: 2, normal: [0, 0, 1], right: [1, 0, 0], up: [0, 1, 0] }, // +Z front
  { value: 5, normal: [0, 0, -1], right: [-1, 0, 0], up: [0, 1, 0] }, // -Z back
];

// Resting orientation [ax, ay, az] that puts each value's face on top (+Y).
const REST: Record<number, Vec3> = {
  1: [0, 0, 0],
  6: [Math.PI, 0, 0],
  2: [-Math.PI / 2, 0, 0],
  5: [Math.PI / 2, 0, 0],
  3: [0, 0, Math.PI / 2],
  4: [0, 0, -Math.PI / 2],
};

const PIPS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-0.5, -0.5],
    [0.5, 0.5],
  ],
  3: [
    [-0.5, -0.5],
    [0, 0],
    [0.5, 0.5],
  ],
  4: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
  5: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [0, 0],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
  6: [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0],
    [0.5, 0],
    [-0.5, 0.5],
    [0.5, 0.5],
  ],
};

const LIGHT: Vec3 = (() => {
  const v: Vec3 = [0.4, 0.8, 0.6];
  const m = Math.hypot(...v);
  return [v[0] / m, v[1] / m, v[2] / m];
})();

function rotate([x, y, z]: Vec3, ax: number, ay: number, az: number): Vec3 {
  // Rx
  const y1 = y * Math.cos(ax) - z * Math.sin(ax);
  const z1 = y * Math.sin(ax) + z * Math.cos(ax);
  const x1 = x;
  // Ry
  const x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
  const z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
  const y2 = y1;
  // Rz
  const x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
  const y3 = x2 * Math.sin(az) + y2 * Math.cos(az);
  const z3 = z2;
  return [x3, y3, z3];
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function drawCube(ctx: CanvasRenderingContext2D, size: number, ax: number, ay: number, az: number) {
  const S = size;
  const s = S * 0.3; // cube half-size in px
  const cx = S / 2;
  const cy = S / 2;
  const focal = s * 6;
  ctx.clearRect(0, 0, S, S);

  const project = (p: Vec3): [number, number] => {
    const persp = focal / (focal + p[2]);
    return [cx + p[0] * persp, cy - p[1] * persp];
  };

  // Compute visible faces with depth + shading.
  const drawables = FACES.map((f) => {
    const n = rotate(f.normal, ax, ay, az);
    const right = rotate(f.right, ax, ay, az);
    const up = rotate(f.up, ax, ay, az);
    const centre = rotate(f.normal, ax, ay, az).map((c) => c * s) as Vec3;
    const corners: Vec3[] = [
      [
        centre[0] - right[0] * s - up[0] * s,
        centre[1] - right[1] * s - up[1] * s,
        centre[2] - right[2] * s - up[2] * s,
      ],
      [
        centre[0] + right[0] * s - up[0] * s,
        centre[1] + right[1] * s - up[1] * s,
        centre[2] + right[2] * s - up[2] * s,
      ],
      [
        centre[0] + right[0] * s + up[0] * s,
        centre[1] + right[1] * s + up[1] * s,
        centre[2] + right[2] * s + up[2] * s,
      ],
      [
        centre[0] - right[0] * s + up[0] * s,
        centre[1] - right[1] * s + up[1] * s,
        centre[2] - right[2] * s + up[2] * s,
      ],
    ];
    const avgZ = corners.reduce((sum, c) => sum + c[2], 0) / 4;
    return { f, n, right, up, centre, corners, avgZ, visible: n[2] > 0.01 };
  })
    .filter((d) => d.visible)
    .sort((a, b) => a.avgZ - b.avgZ);

  for (const d of drawables) {
    const shade = 0.58 + 0.42 * Math.max(0, dot(d.n, LIGHT));
    const v = Math.round(244 * shade);
    ctx.beginPath();
    d.corners.forEach((c, i) => {
      const [px, py] = project(c);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    ctx.fillStyle = `rgb(${v}, ${v}, ${Math.round(v * 0.99)})`;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(30,30,40,0.45)";
    ctx.stroke();

    // Pips.
    const pipR = s * 0.12;
    for (const [u, w] of PIPS[d.f.value]) {
      const p: Vec3 = [
        d.centre[0] + d.right[0] * u * s * 0.62 + d.up[0] * w * s * 0.62,
        d.centre[1] + d.right[1] * u * s * 0.62 + d.up[1] * w * s * 0.62,
        d.centre[2] + d.right[2] * u * s * 0.62 + d.up[2] * w * s * 0.62,
      ];
      const [px, py] = project(p);
      ctx.beginPath();
      ctx.arc(px, py, pipR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40,40,52,${0.55 + 0.45 * shade})`;
      ctx.fill();
    }
  }
}

/** A single 3D die that tumbles to `value` whenever `rollId` changes. */
function DiceCube({ value, rollId, size = 84 }: { value: number; rollId: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const angles = useRef<Vec3>([REST[1][0], REST[1][1], REST[1][2]]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctxRef.current = ctx;
    drawCube(ctx, size, ...angles.current);
  }, [size]);

  // Tumble to the assigned value on each roll.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (rollId === 0) {
      drawCube(ctx, size, ...angles.current);
      return;
    }
    const start: Vec3 = [...angles.current];
    const base = REST[value];
    const spin = (i: number) =>
      2 * Math.PI * (2 + Math.floor(Math.random() * 3)) * (i % 2 ? 1 : -1);
    const end: Vec3 = [base[0] + spin(0), base[1] + spin(1), base[2] + spin(2)];
    const duration = 1000;
    let raf = 0;
    let startTime = 0;
    const loop = (now: number) => {
      if (!startTime) startTime = now;
      const p = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      const a: Vec3 = [
        start[0] + (end[0] - start[0]) * eased,
        start[1] + (end[1] - start[1]) * eased,
        start[2] + (end[2] - start[2]) * eased,
      ];
      angles.current = a;
      drawCube(ctx, size, ...a);
      if (p < 1) raf = requestAnimationFrame(loop);
      else angles.current = base;
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollId, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}

export function Dice3D() {
  const { t } = useTranslation();
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>([1, 1]);
  const [rollId, setRollId] = useState(0);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    sound.roll();
    setValues(Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1));
    setRollId((n) => n + 1);
    window.setTimeout(() => {
      setRolling(false);
      sound.match();
    }, 1050);
  };

  const setN = (n: number) => {
    const next = Math.max(1, Math.min(5, n));
    setCount(next);
    setValues((v) => Array.from({ length: next }, (_, i) => v[i] ?? 1));
  };

  const total = values.reduce((a, b) => a + b, 0);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex min-h-24 flex-wrap items-center justify-center gap-3">
        {values.map((v, i) => (
          <DiceCube key={i} value={v} rollId={rollId} />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setN(count - 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="-"
        >
          <Icon name="Minus" size={16} />
        </button>
        <span className="text-muted w-24 text-center text-sm">
          {count} {t("cd.diceCount")}
        </span>
        <button
          onClick={() => setN(count + 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="+"
        >
          <Icon name="Plus" size={16} />
        </button>
      </div>

      <Button size="lg" onClick={roll} disabled={rolling} className="w-40 whitespace-nowrap">
        <Icon name="Dices" size={18} /> {t("cd.roll")}
      </Button>
      <p className="text-muted text-sm">
        {t("cd.total")}: <b className="text-foreground tabular-nums">{total}</b>
      </p>
    </div>
  );
}
