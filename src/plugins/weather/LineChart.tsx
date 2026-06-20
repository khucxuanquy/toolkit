"use client";

import { useId, useState } from "react";

export interface ChartSeries {
  values: number[];
  /** Stroke color (any CSS color). */
  color: string;
  /** Fill the area under the line with a faint gradient of this color. */
  fill?: boolean;
  /** Name shown in the hover tooltip. */
  name?: string;
}

interface LineChartProps {
  series: ChartSeries[];
  labels: string[];
  unit?: string;
  height?: number;
  /** Show every Nth x-axis label to avoid crowding. */
  labelEvery?: number;
}

/**
 * Minimal dependency-free SVG line chart. Renders one or more temperature
 * series over a shared x-axis, with a hover tooltip showing each point's value.
 * Uses a viewBox so it scales to its container.
 */
export function LineChart({ series, labels, unit = "°", height = 200, labelEvery = 1 }: LineChartProps) {
  const gid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<{ index: number; xPx: number; yPx: number } | null>(null);

  const W = 1000;
  const H = (height / 320) * 1000; // keep stroke proportions sane in viewBox units
  const padL = 70;
  const padR = 30;
  const padT = 40;
  const padB = 60;

  const all = series.flatMap((s) => s.values);
  if (all.length === 0 || labels.length === 0) return null;
  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15;
  min = Math.floor(min - pad);
  max = Math.ceil(max + pad);

  const n = labels.length;
  const x = (i: number) => padL + (i / Math.max(1, n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  // Horizontal gridlines (4 steps).
  const ticks = 4;
  const gridVals = Array.from({ length: ticks + 1 }, (_, i) => Math.round(min + (i / ticks) * (max - min)));

  const linePath = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  const areaPath = (vals: number[]) =>
    `${linePath(vals)} L ${x(n - 1).toFixed(1)} ${y(min).toFixed(1)} L ${x(0).toFixed(1)} ${y(min).toFixed(1)} Z`;

  // Map a pointer position to the nearest data index (viewBox uses
  // preserveAspectRatio="none", so x scales linearly with container width).
  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const px = e.clientX - rect.left;
    const leftPx = (padL / W) * rect.width;
    const rightPx = ((W - padR) / W) * rect.width;
    const frac = (px - leftPx) / Math.max(1, rightPx - leftPx);
    const idx = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
    // Tooltip anchor: the highest (topmost) series value at this index.
    const topV = Math.max(...series.map((s) => s.values[idx]));
    const xPx = (x(idx) / W) * rect.width;
    const yPx = (y(topV) / H) * rect.height;
    setHover({ index: idx, xPx, yPx });
  };

  return (
    <div
      className="relative"
      style={{ height, touchAction: "none" }}
      onPointerMove={handleMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          {series.map((s, si) =>
            s.fill ? (
              <linearGradient key={si} id={`${gid}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ) : null,
          )}
        </defs>

        {/* gridlines + y labels */}
        {gridVals.map((gv, i) => (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={y(gv)}
              y2={y(gv)}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
            />
            <text x={padL - 12} y={y(gv) + 6} fill="rgba(255,255,255,0.55)" fontSize="20" textAnchor="end">
              {gv}{unit}
            </text>
          </g>
        ))}

        {/* x labels */}
        {labels.map((lb, i) =>
          i % labelEvery === 0 ? (
            <text key={i} x={x(i)} y={H - padB + 30} fill="rgba(255,255,255,0.55)" fontSize="19" textAnchor="middle">
              {lb}
            </text>
          ) : null,
        )}

        {/* hover guide line */}
        {hover && (
          <line
            x1={x(hover.index)}
            x2={x(hover.index)}
            y1={padT}
            y2={H - padB}
            stroke="rgba(255,255,255,0.45)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
        )}

        {/* areas + lines + dots */}
        {series.map((s, si) => (
          <g key={si}>
            {s.fill && <path d={areaPath(s.values)} fill={`url(#${gid}-fill-${si})`} />}
            <path
              d={linePath(s.values)}
              fill="none"
              stroke={s.color}
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {s.values.map((v, i) =>
              n <= 16 ? <circle key={i} cx={x(i)} cy={y(v)} r="5" fill={s.color} /> : null,
            )}
            {/* enlarged hover dot */}
            {hover && (
              <circle cx={x(hover.index)} cy={y(s.values[hover.index])} r="8" fill={s.color} stroke="#fff" strokeWidth="2.5" />
            )}
          </g>
        ))}
      </svg>

      {/* tooltip */}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl bg-slate-900/90 px-3 py-2 text-xs shadow-lg ring-1 ring-white/15 backdrop-blur-sm"
          style={{
            left: `${hover.xPx}px`,
            top: `${hover.yPx}px`,
            transform: "translate(-50%, calc(-100% - 12px))",
            whiteSpace: "nowrap",
          }}
        >
          <div className="mb-1 font-semibold text-white">{labels[hover.index]}</div>
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-2 text-white/90">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name && <span className="text-white/60">{s.name}</span>}
              <span className="ml-auto font-semibold">{s.values[hover.index]}{unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
