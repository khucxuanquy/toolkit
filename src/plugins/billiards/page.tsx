"use client";

import { useEffect, useRef } from "react";
import { useTranslation } from "@/core/i18n/useTranslation";
import { BilliardsGame } from "./BilliardsGame";

/**
 * React wrapper that mounts the canvas-based {@link BilliardsGame} engine.
 * All gameplay lives in the engine; React only owns the mount point.
 */
export default function BilliardsPage() {
  const { t } = useTranslation();
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<BilliardsGame | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const game = new BilliardsGame();
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
      title: t("bil.title"),
      chooseGame: t("bil.chooseGame"),
      players: t("bil.players"),
      eightBall: t("bil.eightBall"),
      nineBall: t("bil.nineBall"),
      onePlayer: t("bil.onePlayer"),
      twoPlayers: t("bil.twoPlayers"),
      startGame: t("bil.startGame"),
      menu: t("bil.menu"),
      you: t("bil.you"),
      cpu: t("bil.cpu"),
      player: t("bil.player"),
      turn: t("bil.turn"),
      thinking: t("bil.thinking"),
      youGroup: t("bil.youGroup"),
      twoGroups: t("bil.twoGroups"),
      ballOn: t("bil.ballOn"),
      ballInHand: t("bil.ballInHand"),
      spin: t("bil.spin"),
      solids: t("bil.solids"),
      stripes: t("bil.stripes"),
      unknownGroup: t("bil.unknownGroup"),
      youWin: t("bil.youWin"),
      cpuWins: t("bil.cpuWins"),
      playerWins: t("bil.playerWins"),
      playAgain: t("bil.playAgain"),
      break8: t("bil.break8"),
      break9: t("bil.break9"),
      foul: t("bil.foul"),
      reasonSep: t("bil.reasonSep"),
      reasonScratch: t("bil.reasonScratch"),
      reasonNoContact: t("bil.reasonNoContact"),
      reasonMustHit8: t("bil.reasonMustHit8"),
      reasonWrongGroup: t("bil.reasonWrongGroup"),
      reasonCantHit8Open: t("bil.reasonCantHit8Open"),
      reasonNoRail: t("bil.reasonNoRail"),
      reasonMustHitLowest: t("bil.reasonMustHitLowest"),
      eightBreakRespot: t("bil.eightBreakRespot"),
      eightBreakRespotFoul: t("bil.eightBreakRespotFoul"),
      win8: t("bil.win8"),
      lose8: t("bil.lose8"),
      takesGroup: t("bil.takesGroup"),
      potContinue: t("bil.potContinue"),
      nothingDropped: t("bil.nothingDropped"),
      win9: t("bil.win9"),
      foul9: t("bil.foul9"),
    });
  }, [t]);

  return (
    <div
      ref={hostRef}
      className="border-border relative w-full overflow-hidden rounded-2xl border bg-[#0b1220]"
      style={{ height: "min(82vh, 720px)" }}
    />
  );
}
