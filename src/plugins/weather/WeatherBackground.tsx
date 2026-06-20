"use client";

import { useMemo } from "react";

export type SkyKind = "clear-day" | "clear-night" | "cloudy" | "rain" | "storm" | "snow" | "fog";

/** Map a WMO weather code + day/night flag to a visual sky kind. */
export function skyKind(code: number, isDay: boolean): SkyKind {
  if (code >= 95) return "storm";
  if (code >= 71 && code <= 77) return "snow";
  if (code >= 85 && code <= 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code >= 45 && code <= 48) return "fog";
  if (code >= 2) return "cloudy";
  return isDay ? "clear-day" : "clear-night";
}

/** Gradient classes per sky kind. */
export function skyGradient(kind: SkyKind): string {
  switch (kind) {
    case "storm":
      return "from-slate-800 via-slate-700 to-slate-900";
    case "snow":
      return "from-sky-300 via-slate-300 to-indigo-300";
    case "rain":
      return "from-slate-500 via-blue-600 to-slate-700";
    case "fog":
      return "from-slate-400 via-slate-500 to-slate-600";
    case "cloudy":
      return "from-sky-500 via-slate-500 to-slate-600";
    case "clear-night":
      return "from-indigo-950 via-slate-900 to-blue-950";
    case "clear-day":
    default:
      return "from-sky-400 via-blue-500 to-indigo-500";
  }
}

// Deterministic pseudo-random so SSR and client agree (no Math.random in render path
// that would mismatch — values are fixed per index).
function seeded(i: number, salt: number) {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Rain({ heavy }: { heavy?: boolean }) {
  const drops = heavy ? 70 : 45;
  const items = useMemo(
    () =>
      Array.from({ length: drops }, (_, i) => ({
        left: seeded(i, 1) * 100,
        delay: seeded(i, 2) * 1.2,
        dur: 0.5 + seeded(i, 3) * 0.5,
        h: 12 + seeded(i, 4) * 18,
        op: 0.25 + seeded(i, 5) * 0.4,
      })),
    [drops],
  );
  return (
    <div className="wx-layer">
      {items.map((d, i) => (
        <span
          key={i}
          className="wx-drop"
          style={{
            left: `${d.left}%`,
            height: `${d.h}px`,
            opacity: d.op,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

function Snow() {
  const items = useMemo(
    () =>
      Array.from({ length: 50 }, (_, i) => ({
        left: seeded(i, 1) * 100,
        delay: seeded(i, 2) * 5,
        dur: 5 + seeded(i, 3) * 6,
        size: 4 + seeded(i, 4) * 6,
        drift: (seeded(i, 5) - 0.5) * 40,
        op: 0.4 + seeded(i, 6) * 0.5,
      })),
    [],
  );
  return (
    <div className="wx-layer">
      {items.map((s, i) => (
        <span
          key={i}
          className="wx-flake"
          style={
            {
              left: `${s.left}%`,
              width: `${s.size}px`,
              height: `${s.size}px`,
              opacity: s.op,
              animationDelay: `${s.delay}s`,
              animationDuration: `${s.dur}s`,
              "--drift": `${s.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Clouds({ count = 4, dark }: { count?: number; dark?: boolean }) {
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        top: 5 + seeded(i, 1) * 45,
        delay: -seeded(i, 2) * 40,
        dur: 40 + seeded(i, 3) * 40,
        scale: 0.7 + seeded(i, 4) * 0.9,
        op: 0.5 + seeded(i, 5) * 0.4,
      })),
    [count],
  );
  return (
    <div className="wx-layer">
      {items.map((c, i) => (
        <span
          key={i}
          className="wx-cloud"
          style={{
            top: `${c.top}%`,
            opacity: c.op,
            transform: `scale(${c.scale})`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.dur}s`,
            background: dark ? "rgba(180,190,210,0.55)" : "rgba(255,255,255,0.85)",
          }}
        />
      ))}
    </div>
  );
}

function Stars() {
  const items = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: seeded(i, 1) * 100,
        top: seeded(i, 2) * 70,
        size: 1 + seeded(i, 3) * 2,
        delay: seeded(i, 4) * 3,
        dur: 1.5 + seeded(i, 5) * 2.5,
      })),
    [],
  );
  return (
    <div className="wx-layer">
      {items.map((s, i) => (
        <span
          key={i}
          className="wx-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

function Sun() {
  return (
    <div className="wx-layer">
      <span className="wx-sun" />
      <span className="wx-sun-rays" />
    </div>
  );
}

function Lightning() {
  return <div className="wx-layer wx-lightning" />;
}

function Fog() {
  return (
    <div className="wx-layer">
      <span className="wx-fog" style={{ animationDuration: "30s", top: "30%" }} />
      <span className="wx-fog" style={{ animationDuration: "45s", top: "55%", animationDelay: "-10s" }} />
    </div>
  );
}

/** Full-bleed animated weather effects positioned behind the page content. */
export function WeatherBackground({ kind }: { kind: SkyKind }) {
  return (
    <div className="wx-root" aria-hidden>
      {kind === "clear-day" && <Sun />}
      {kind === "clear-night" && <Stars />}
      {kind === "cloudy" && <Clouds count={5} />}
      {kind === "fog" && (
        <>
          <Clouds count={3} dark />
          <Fog />
        </>
      )}
      {kind === "rain" && (
        <>
          <Clouds count={4} dark />
          <Rain />
        </>
      )}
      {kind === "storm" && (
        <>
          <Clouds count={5} dark />
          <Rain heavy />
          <Lightning />
        </>
      )}
      {kind === "snow" && (
        <>
          <Clouds count={3} />
          <Snow />
        </>
      )}

      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
.wx-root { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
.wx-layer { position: absolute; inset: 0; }

/* rain */
.wx-drop {
  position: absolute; top: -10%; width: 2px;
  background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0.85));
  border-radius: 9999px;
  animation-name: wx-fall; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes wx-fall {
  0% { transform: translateY(-20vh); }
  100% { transform: translateY(120vh); }
}

/* snow */
.wx-flake {
  position: absolute; top: -5%; border-radius: 9999px; background: #fff;
  animation-name: wx-snow; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes wx-snow {
  0% { transform: translate(0, -10vh); }
  100% { transform: translate(var(--drift, 0), 110vh); }
}

/* clouds */
.wx-cloud {
  position: absolute; left: -25%; width: 180px; height: 60px; border-radius: 9999px;
  filter: blur(8px);
  animation-name: wx-drift; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes wx-drift {
  0% { transform: translateX(-30vw) scale(var(--s,1)); }
  100% { transform: translateX(130vw) scale(var(--s,1)); }
}

/* stars */
.wx-star {
  position: absolute; border-radius: 9999px; background: #fff;
  animation-name: wx-twinkle; animation-timing-function: ease-in-out; animation-iteration-count: infinite;
}
@keyframes wx-twinkle {
  0%, 100% { opacity: 0.2; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* sun */
.wx-sun {
  position: absolute; top: -60px; right: -60px; width: 240px; height: 240px; border-radius: 9999px;
  background: radial-gradient(circle, rgba(255,247,200,0.95) 0%, rgba(255,221,120,0.55) 40%, rgba(255,200,80,0) 70%);
  animation: wx-pulse 6s ease-in-out infinite;
}
.wx-sun-rays {
  position: absolute; top: -160px; right: -160px; width: 440px; height: 440px; border-radius: 9999px;
  background: conic-gradient(from 0deg, rgba(255,236,160,0.22) 0deg, transparent 18deg, rgba(255,236,160,0.22) 36deg, transparent 54deg, rgba(255,236,160,0.22) 72deg, transparent 90deg, rgba(255,236,160,0.22) 108deg, transparent 126deg, rgba(255,236,160,0.22) 144deg, transparent 162deg, rgba(255,236,160,0.22) 180deg, transparent 198deg, rgba(255,236,160,0.22) 216deg, transparent 234deg, rgba(255,236,160,0.22) 252deg, transparent 270deg, rgba(255,236,160,0.22) 288deg, transparent 306deg, rgba(255,236,160,0.22) 324deg, transparent 342deg);
  animation: wx-spin 90s linear infinite;
}
@keyframes wx-pulse { 0%,100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.08); opacity: 1; } }
@keyframes wx-spin { to { transform: rotate(360deg); } }

/* fog */
.wx-fog {
  position: absolute; left: -20%; width: 140%; height: 120px;
  background: linear-gradient(to right, transparent, rgba(230,235,245,0.4), transparent);
  filter: blur(14px);
  animation-name: wx-fogdrift; animation-timing-function: linear; animation-iteration-count: infinite;
}
@keyframes wx-fogdrift { 0% { transform: translateX(-15%); } 100% { transform: translateX(15%); } }

/* lightning */
.wx-lightning {
  background: rgba(255,255,255,0.9); opacity: 0;
  animation: wx-flash 7s linear infinite;
}
@keyframes wx-flash {
  0%, 90%, 100% { opacity: 0; }
  91% { opacity: 0.7; }
  92% { opacity: 0.1; }
  93% { opacity: 0.6; }
  95% { opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .wx-drop, .wx-flake, .wx-cloud, .wx-star, .wx-sun, .wx-sun-rays, .wx-fog, .wx-lightning { animation: none !important; }
  .wx-lightning { display: none; }
}
`;
