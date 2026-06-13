"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { colorForIndex, sliceAngles, targetRotationFor, weightedPick } from "../logic";
import { wheelSound } from "../lib/sound";
import type { WheelEntry } from "../types";

const SIZE = 360; // logical drawing size in px
const SPIN_DURATION_MS = 4400;

interface WheelProps {
  entries: WheelEntry[];
  soundEnabled: boolean;
  onResult: (winner: WheelEntry) => void;
}

function truncate(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

export function Wheel({ entries, soundEnabled, onResult }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const { t } = useTranslation();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = SIZE * dpr;
    if (canvas.width !== size) {
      canvas.width = size;
      canvas.height = size;
    }
    const r = SIZE / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    ctx.save();
    ctx.translate(r, r);

    if (entries.length === 0) {
      ctx.beginPath();
      ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
      ctx.fillStyle = "#cbd5e1";
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.rotate(rotationRef.current);
    const slices = sliceAngles(entries);
    slices.forEach((slice, i) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r - 6, slice.start, slice.end);
      ctx.closePath();
      ctx.fillStyle = colorForIndex(i);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.rotate(slice.mid);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      ctx.font = `600 ${entries.length > 12 ? 11 : 14}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(truncate(entries[i].label), r - 18, 0);
      ctx.restore();
    });
    ctx.restore();

    // Center hub
    ctx.beginPath();
    ctx.arc(r, r, 26, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [entries]);

  // Redraw when entries change (and on mount).
  useEffect(() => {
    draw();
  }, [draw]);

  // Stop any animation on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const spin = () => {
    if (spinning || entries.length < 2) return;
    setSpinning(true);

    const winnerIndex = weightedPick(entries);
    const spins = 5 + Math.floor(Math.random() * 3);
    const target = targetRotationFor(
      entries,
      winnerIndex,
      rotationRef.current,
      spins,
      Math.random(),
    );
    const start = rotationRef.current;
    const startTime = performance.now();
    const slices = sliceAngles(entries);
    let lastSlice = -1;

    const tickIfCrossed = () => {
      if (!soundEnabled) return;
      const pointer =
        ((((3 * Math.PI) / 2 - rotationRef.current) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const idx = slices.findIndex((s) => pointer >= s.start && pointer < s.end);
      if (idx !== lastSlice) {
        lastSlice = idx;
        wheelSound.tick();
      }
    };

    const animate = (now: number) => {
      const t = Math.min(1, (now - startTime) / SPIN_DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      rotationRef.current = start + (target - start) * eased;
      draw();
      tickIfCrossed();
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        rotationRef.current = target;
        draw();
        setSpinning(false);
        if (soundEnabled) wheelSound.win();
        onResult(entries[winnerIndex]);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-full max-w-[360px]">
        {/* Winner pointer — a rounded teardrop pin pointing into the top slice. */}
        <div className="absolute -top-[18px] left-1/2 z-20 -translate-x-1/2 drop-shadow-md">
          <svg width="30" height="40" viewBox="0 0 32 42" aria-hidden="true">
            <defs>
              <linearGradient id="wheel-pointer-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" />
                <stop offset="100%" stopColor="var(--color-accent)" />
              </linearGradient>
            </defs>
            {/* Teardrop: round top, point at the bottom (tip touches the rim). */}
            <path
              d="M16 41 C 8 29, 2 24, 2 16 C 2 7.7 8.27 2 16 2 C 23.73 2 30 7.7 30 16 C 30 24 24 29 16 41 Z"
              fill="url(#wheel-pointer-grad)"
              stroke="white"
              strokeWidth="2"
            />
            <circle cx="16" cy="16" r="5" fill="white" />
          </svg>
        </div>
        <div className="aspect-square w-full overflow-hidden rounded-full shadow-lg">
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "100%" }}
            aria-label={t("wheel.wheelAria")}
          />
        </div>
        {/* Center spin button */}
        <button
          onClick={spin}
          disabled={spinning || entries.length < 2}
          className="from-primary to-accent absolute top-1/2 left-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          aria-label={t("wheel.spinAria")}
        >
          <Icon name="Play" size={22} />
        </button>
      </div>

      <Button onClick={spin} disabled={spinning || entries.length < 2} size="lg" className="w-44">
        <Icon name="Disc3" size={18} className={spinning ? "animate-spin" : ""} />
        {spinning ? t("wheel.spinning") : t("wheel.spin")}
      </Button>
    </div>
  );
}
