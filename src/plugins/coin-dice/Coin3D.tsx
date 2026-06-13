"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";

const W = 240;
const H = 240;
const CX = W / 2;
const CY = H / 2;
const R = 82; // coin radius
const TOSS = 64; // peak toss height (px)
const DURATION = 1150;

type Face = "heads" | "tails";

/** Draw the coin at rotation angle A (radians about a horizontal axis) with a
 *  vertical toss offset. The visible face flips as cos(A) changes sign. */
function drawCoin(
  ctx: CanvasRenderingContext2D,
  a: number,
  tossY: number,
  headsLabel: string,
  tailsLabel: string,
) {
  ctx.clearRect(0, 0, W, H);
  const c = Math.cos(a);
  const ry = R * Math.abs(c);
  const cy = CY + tossY;

  // Ground shadow (shrinks as the coin lifts).
  const lift = Math.min(1, Math.abs(tossY) / TOSS);
  ctx.save();
  ctx.globalAlpha = 0.18 * (1 - lift * 0.7);
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(CX, CY + R + 16, R * (0.85 - lift * 0.3), 9 * (1 - lift * 0.4), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const heads = c >= 0;
  const edge = heads ? "#b8860b" : "#9d174d";

  if (ry < 7) {
    // Edge-on: draw the coin's metallic side.
    ctx.fillStyle = edge;
    ctx.beginPath();
    ctx.roundRect(CX - R, cy - 6, R * 2, 12, 6);
    ctx.fill();
    return;
  }

  // Coin face.
  const grad = ctx.createLinearGradient(CX - R, cy, CX + R, cy);
  if (heads) {
    grad.addColorStop(0, "#fde68a");
    grad.addColorStop(0.5, "#f59e0b");
    grad.addColorStop(1, "#b45309");
  } else {
    grad.addColorStop(0, "#fbcfe8");
    grad.addColorStop(0.5, "#ec4899");
    grad.addColorStop(1, "#9d174d");
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(CX, cy, R, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = edge;
  ctx.stroke();

  // Inner ring.
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.beginPath();
  ctx.ellipse(CX, cy, R * 0.8, ry * 0.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Label, squished vertically with the rotation for a 3D feel.
  ctx.save();
  ctx.translate(CX, cy);
  ctx.scale(1, Math.abs(c));
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 26px ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(heads ? headsLabel : tailsLabel, 0, 0);
  ctx.restore();
}

export function Coin3D() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const angleRef = useRef(0);
  const flipIdRef = useRef(0);
  const [flipId, setFlipId] = useState(0);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<Face | null>(null);
  const [counts, setCounts] = useState({ heads: 0, tails: 0 });

  const headsLabel = t("cd.heads");
  const tailsLabel = t("cd.tails");
  const labelsRef = useRef({ headsLabel, tailsLabel });

  // Keep the latest labels available to the canvas draws without re-running the
  // animation effects (updating a ref in render is not allowed).
  useEffect(() => {
    labelsRef.current = { headsLabel, tailsLabel };
    const ctx = ctxRef.current;
    if (ctx && !flipping) {
      drawCoin(ctx, angleRef.current, 0, headsLabel, tailsLabel);
    }
  }, [headsLabel, tailsLabel, flipping]);

  // Canvas setup + initial draw.
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
    drawCoin(ctx, angleRef.current, 0, labelsRef.current.headsLabel, labelsRef.current.tailsLabel);
  }, []);

  // Run a flip whenever flipId increments.
  useEffect(() => {
    if (flipId === 0) return;
    const ctx = ctxRef.current;
    if (!ctx) return;

    const face: Face = Math.random() < 0.5 ? "heads" : "tails";
    const start = angleRef.current;
    const halfTurns = 8 + Math.floor(Math.random() * 5);
    let k = Math.round(start / Math.PI) + halfTurns;
    const wantOdd = face === "tails"; // odd multiples of π show tails
    if (k % 2 === 0 ? wantOdd : !wantOdd) k += 1;
    const end = k * Math.PI;

    let raf = 0;
    let startTime = 0;
    const loop = (now: number) => {
      if (!startTime) startTime = now;
      const p = Math.min(1, (now - startTime) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const a = start + (end - start) * eased;
      const tossY = -TOSS * Math.sin(p * Math.PI);
      angleRef.current = a;
      drawCoin(ctx, a, tossY, labelsRef.current.headsLabel, labelsRef.current.tailsLabel);
      if (p < 1) {
        raf = requestAnimationFrame(loop);
      } else {
        angleRef.current = end;
        drawCoin(ctx, end, 0, labelsRef.current.headsLabel, labelsRef.current.tailsLabel);
        setResult(face);
        setCounts((c) => ({ ...c, [face]: c[face] + 1 }));
        setFlipping(false);
        sound.match();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [flipId]);

  const flip = () => {
    if (flipping) return;
    setFlipping(true);
    setResult(null);
    sound.flip();
    flipIdRef.current += 1;
    setFlipId(flipIdRef.current);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <canvas
        ref={canvasRef}
        style={{ width: W, height: H }}
        className="max-w-full"
        aria-label={result ? t(result === "heads" ? "cd.heads" : "cd.tails") : t("cd.tabCoin")}
      />
      <Button size="lg" onClick={flip} disabled={flipping} className="w-40 whitespace-nowrap">
        <Icon name="Coins" size={18} /> {t("cd.flip")}
      </Button>
      <div className="text-muted flex gap-6 text-sm">
        <span>
          {headsLabel}: <b className="text-foreground tabular-nums">{counts.heads}</b>
        </span>
        <span>
          {tailsLabel}: <b className="text-foreground tabular-nums">{counts.tails}</b>
        </span>
      </div>
    </div>
  );
}
