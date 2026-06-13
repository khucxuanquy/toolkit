"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";
import type { Board as BoardType, Mark, Player } from "../types";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";

interface BoardProps {
  board: BoardType;
  winningLine?: readonly number[];
  disabled: boolean;
  frozen: boolean;
  lifetimeMs: number;
  onPlay: (index: number) => void;
}

const MARK_COLOR: Record<Player, string> = { X: "text-primary", O: "text-accent" };
const RING_COLOR: Record<Player, string> = { X: "stroke-primary", O: "stroke-accent" };

const RADIUS = 42;
const CIRC = 2 * Math.PI * RADIUS;

/** A placed mark with a CSS-driven countdown ring that depletes over `lifetimeMs`. */
function CellMark({
  mark,
  lifetimeMs,
  frozen,
  winning,
}: {
  mark: Mark;
  lifetimeMs: number;
  frozen: boolean;
  winning: boolean;
}) {
  const playState = frozen ? "paused" : "running";
  return (
    <>
      {/* The SVG fills the whole cell and the viewBox centers the circle
          (preserveAspectRatio = xMidYMid by default). The whole SVG is rotated
          -90° (reliable around its center) so the ring depletes from the top —
          rotating the <circle> directly is unreliable (transform-box quirks),
          and using inset-% on a replaced <svg> shifts it off-centre. */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          strokeWidth={5}
          strokeLinecap="round"
          className={cn(winning ? "stroke-success" : RING_COLOR[mark.player], "opacity-60")}
          style={
            {
              "--ring-circ": CIRC,
              strokeDasharray: CIRC,
              animation: `ttt-ring-deplete ${lifetimeMs}ms linear forwards`,
              animationPlayState: playState,
            } as CSSProperties
          }
        />
      </svg>
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 360, damping: 22 }}
        className={cn(
          "relative font-extrabold",
          winning ? "text-success" : MARK_COLOR[mark.player],
        )}
        style={{
          animation: frozen
            ? undefined
            : `ttt-flicker 0.5s ease-in-out ${lifetimeMs * 0.7}ms infinite`,
          animationPlayState: playState,
        }}
      >
        {mark.player}
      </motion.span>
    </>
  );
}

export function Board({ board, winningLine, disabled, frozen, lifetimeMs, onPlay }: BoardProps) {
  const { t } = useTranslation();
  return (
    <div className="grid w-full max-w-sm grid-cols-3 gap-2">
      {board.map((mark, i) => {
        const winning = winningLine?.includes(i) ?? false;
        const playable = !disabled && mark === null;
        return (
          <button
            key={i}
            onClick={() => playable && onPlay(i)}
            disabled={!playable}
            aria-label={t("ttt.cellLabel", { n: i + 1 })}
            className={cn(
              // aspect-square on each cell keeps every cell an identical square,
              // whether it's empty or holds a mark.
              "border-border bg-surface relative flex aspect-square items-center justify-center overflow-hidden rounded-2xl border text-5xl leading-none transition-colors sm:text-6xl",
              playable && "hover:border-primary/50 hover:bg-surface-2",
              winning && "border-success/60 bg-success/10",
            )}
          >
            {mark && (
              <CellMark mark={mark} lifetimeMs={lifetimeMs} frozen={frozen} winning={winning} />
            )}
          </button>
        );
      })}
    </div>
  );
}
