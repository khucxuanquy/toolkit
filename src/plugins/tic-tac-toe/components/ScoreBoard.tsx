"use client";

import { useTranslation } from "@/core/i18n/useTranslation";
import type { Player, Scores } from "../types";
import { cn } from "@/shared/utils/cn";

interface ScoreBoardProps {
  scores: Scores;
  current: Player;
  gameOver: boolean;
}

/** X score · current turn · O score. */
export function ScoreBoard({ scores, current, gameOver }: ScoreBoardProps) {
  const { t } = useTranslation();
  return (
    <div className="border-border bg-surface grid grid-cols-3 items-center gap-3 rounded-xl border p-3">
      <div className="text-center">
        <div className="text-primary text-3xl font-extrabold tabular-nums">{scores.X}</div>
        <div className="text-muted text-xs font-semibold tracking-wide uppercase">X</div>
      </div>

      <div className="text-muted flex flex-col items-center gap-0.5 text-xs">
        <span>{t("ttt.turn")}</span>
        <span
          className={cn(
            "text-2xl font-extrabold transition-opacity",
            current === "X" ? "text-primary" : "text-accent",
            gameOver && "opacity-40",
          )}
        >
          {current}
        </span>
      </div>

      <div className="text-center">
        <div className="text-accent text-3xl font-extrabold tabular-nums">{scores.O}</div>
        <div className="text-muted text-xs font-semibold tracking-wide uppercase">O</div>
      </div>
    </div>
  );
}
