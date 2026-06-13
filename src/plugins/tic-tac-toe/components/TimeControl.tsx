"use client";

import { useTranslation } from "@/core/i18n/useTranslation";
import { Button, Icon } from "@/shared/ui";
import { MAX_LIFETIME_S, MIN_LIFETIME_S } from "../logic";

interface TimeControlProps {
  lifetimeMs: number;
  onLifetimeChange: (ms: number) => void;
  onRestart: () => void;
}

export function TimeControl({ lifetimeMs, onLifetimeChange, onRestart }: TimeControlProps) {
  const { t } = useTranslation();
  const seconds = Math.round(lifetimeMs / 1000);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="text-muted flex items-center gap-3 text-sm">
        <span>{t("ttt.disappearTime")}</span>
        <input
          type="range"
          min={MIN_LIFETIME_S}
          max={MAX_LIFETIME_S}
          step={1}
          value={seconds}
          onChange={(e) => onLifetimeChange(Number(e.target.value) * 1000)}
          className="accent-primary h-1.5 w-32 cursor-pointer"
          aria-label={t("ttt.disappearTime")}
        />
        <span className="text-foreground w-8 font-semibold tabular-nums">{seconds}s</span>
      </label>

      <Button variant="outline" size="sm" onClick={onRestart}>
        <Icon name="RotateCcw" size={16} /> {t("ttt.restart")}
      </Button>
    </div>
  );
}
