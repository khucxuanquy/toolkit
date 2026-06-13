"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { fmtClock } from "../lib/format";
import { alarm } from "../lib/beep";

type Status = "idle" | "running" | "paused" | "done";
const PRESETS = [1, 3, 5, 10, 15]; // minutes

export function CountdownTimer() {
  const { t } = useTranslation();
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [remaining, setRemaining] = useState(0);
  const endRef = useRef(0);

  const durationMs = (minutes * 60 + seconds) * 1000;
  const displayMs = status === "idle" ? durationMs : remaining;

  // Tick from an effect while running (keeps performance.now() out of render).
  useEffect(() => {
    if (status !== "running") return;
    let raf = 0;
    const loop = () => {
      const r = endRef.current - performance.now();
      if (r <= 0) {
        setRemaining(0);
        setStatus("done");
        alarm();
        return;
      }
      setRemaining(r);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [status]);

  const start = () => {
    const base = status === "paused" ? remaining : durationMs;
    if (base <= 0) return;
    endRef.current = performance.now() + base;
    setRemaining(base);
    setStatus("running");
  };
  const pause = () => {
    setRemaining(endRef.current - performance.now());
    setStatus("paused");
  };
  const reset = () => {
    setStatus("idle");
    setRemaining(0);
  };

  const adjust = (setter: (n: number) => void, val: number, max: number) =>
    setter(Math.max(0, Math.min(max, val)));

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "text-center font-mono text-6xl font-bold tabular-nums transition-colors sm:text-7xl",
          status === "done" && "text-danger animate-pulse",
          status === "running" && "text-primary",
        )}
      >
        {fmtClock(displayMs)}
      </div>

      {status === "idle" ? (
        <>
          <div className="flex items-center justify-center gap-4">
            <Stepper
              label={t("timer.minutes")}
              value={minutes}
              onChange={(v) => adjust(setMinutes, v, 999)}
            />
            <span className="text-2xl font-bold">:</span>
            <Stepper
              label={t("timer.seconds")}
              value={seconds}
              onChange={(v) => adjust(setSeconds, v, 59)}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {PRESETS.map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMinutes(m);
                  setSeconds(0);
                }}
                className="bg-surface-2 hover:bg-border rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                {m}m
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="flex justify-center gap-2">
        {status === "running" ? (
          <Button
            size="lg"
            variant="secondary"
            onClick={pause}
            className="min-w-32 whitespace-nowrap"
          >
            <Icon name="Pause" size={18} /> {t("timer.pause")}
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={status === "done" ? reset : start}
            disabled={durationMs <= 0 && status !== "paused"}
            className="min-w-32 whitespace-nowrap"
          >
            <Icon name="Play" size={18} />{" "}
            {status === "paused"
              ? t("timer.resume")
              : status === "done"
                ? t("timer.reset")
                : t("timer.start")}
          </Button>
        )}
        {(status === "running" || status === "paused") && (
          <Button
            size="lg"
            variant="outline"
            onClick={reset}
            className="min-w-32 whitespace-nowrap"
          >
            <Icon name="RotateCcw" size={18} /> {t("timer.reset")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(value - 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="-"
        >
          <Icon name="Minus" size={16} />
        </button>
        <span className="w-12 text-center font-mono text-2xl font-bold tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
        <button
          onClick={() => onChange(value + 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="+"
        >
          <Icon name="Plus" size={16} />
        </button>
      </div>
      <span className="text-muted text-xs">{label}</span>
    </div>
  );
}
