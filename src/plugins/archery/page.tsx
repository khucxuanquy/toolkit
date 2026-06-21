"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/core/i18n/useTranslation";
import { ArcheryGame } from "./ArcheryGame";

/**
 * React wrapper that mounts the framework-agnostic {@link ArcheryGame} engine
 * into a container and drives its lifecycle. All gameplay/rendering lives in the
 * canvas engine; React only owns the mount point and cleanup.
 */
export default function ArcheryPage() {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<ArcheryGame | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new ArcheryGame();
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
      practice: t("arc.practice"),
      moving: t("arc.moving"),
      challenge: t("arc.challenge"),
      wind: t("arc.wind"),
      finalScore: t("arc.finalScore"),
      playAgain: t("arc.playAgain"),
    });
  }, [t]);

  return (
    <div className="space-y-3">
      <div
        ref={hostRef}
        className="border-border bg-sky-200 relative w-full overflow-hidden rounded-2xl border"
        style={{ height: "min(72vh, 660px)" }}
      />
      <p className="text-muted text-center text-sm">{t("arc.help")}</p>
    </div>
  );
}
