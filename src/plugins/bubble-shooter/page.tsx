"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/core/i18n/useTranslation";
import { BubbleShooterGame } from "./BubbleShooterGame";

/**
 * React wrapper that mounts the canvas-based {@link BubbleShooterGame} engine.
 * All gameplay lives in the engine; React only owns the mount point.
 */
export default function BubbleShooterPage() {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<BubbleShooterGame | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new BubbleShooterGame();
    gameRef.current = game;
    game.init(host);
    game.start();
    return () => {
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // Push localized canvas strings; refresh on language change.
  useEffect(() => {
    gameRef.current?.setStrings({
      classic: t("bs.classic"),
      level: t("bs.level"),
      timed: t("bs.timed"),
      survival: t("bs.survival"),
      best: t("bs.best"),
      left: t("bs.left"),
      combo: t("bs.combo"),
      comboFloat: t("bs.comboFloat"),
      youWin: t("bs.youWin"),
      gameOver: t("bs.gameOver"),
      bestColon: t("bs.bestColon"),
      tapPlayAgain: t("bs.tapPlayAgain"),
      paused: t("bs.paused"),
      tapResume: t("bs.tapResume"),
      next: t("bs.next"),
    });
  }, [t]);

  return (
    <div
      ref={hostRef}
      className="border-border relative w-full overflow-hidden rounded-2xl border"
      style={{ height: "min(82vh, 700px)" }}
    />
  );
}
