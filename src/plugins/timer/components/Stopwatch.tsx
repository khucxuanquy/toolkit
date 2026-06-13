"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { fmtStopwatch } from "../lib/format";

export function Stopwatch() {
  const { t } = useTranslation();
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const baseRef = useRef(0); // accumulated ms before current run
  const startRef = useRef(0); // performance.now() at run start

  // Drive the display from an effect while running (keeps the impure
  // performance.now() out of render scope).
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const loop = () => {
      setElapsed(baseRef.current + (performance.now() - startRef.current));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running]);

  const start = () => {
    startRef.current = performance.now();
    setRunning(true);
  };
  const pause = () => {
    baseRef.current += performance.now() - startRef.current;
    setElapsed(baseRef.current);
    setRunning(false);
  };
  const reset = () => {
    baseRef.current = 0;
    setElapsed(0);
    setLaps([]);
    setRunning(false);
  };
  const lap = () => setLaps((l) => [elapsed, ...l]);

  return (
    <div className="space-y-5">
      <div className="text-center font-mono text-5xl font-bold tabular-nums sm:text-6xl">
        {fmtStopwatch(elapsed)}
      </div>
      <div className="flex justify-center gap-2">
        {!running ? (
          <Button size="lg" onClick={start} className="w-32">
            <Icon name="Play" size={18} /> {elapsed > 0 ? t("timer.resume") : t("timer.start")}
          </Button>
        ) : (
          <Button size="lg" variant="secondary" onClick={pause} className="w-32">
            <Icon name="Pause" size={18} /> {t("timer.pause")}
          </Button>
        )}
        {running ? (
          <Button size="lg" variant="outline" onClick={lap} className="w-32">
            <Icon name="Flag" size={18} /> {t("timer.lap")}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="outline"
            onClick={reset}
            disabled={elapsed === 0}
            className="w-32"
          >
            <Icon name="RotateCcw" size={18} /> {t("timer.reset")}
          </Button>
        )}
      </div>

      {laps.length > 0 && (
        <ul className="mx-auto max-h-64 max-w-sm space-y-1.5 overflow-y-auto pr-1">
          {laps.map((l, i) => (
            <li
              key={i}
              className="border-border bg-surface flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span className="text-muted">
                {t("timer.lap")} {laps.length - i}
              </span>
              <span className="font-mono tabular-nums">{fmtStopwatch(l)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
