"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button, Modal, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { useInfinityGame } from "./hooks/useInfinityGame";
import { Board } from "./components/Board";
import { ScoreBoard } from "./components/ScoreBoard";
import { TimeControl } from "./components/TimeControl";

export default function TicTacToePage() {
  const game = useInfinityGame();
  const { t } = useTranslation();
  const [resultClosed, setResultClosed] = useState(false);

  const seconds = Math.round(game.lifetimeMs / 1000);
  const showResult = game.gameOver && !resultClosed;

  const handleRestart = () => {
    game.restart();
    setResultClosed(false);
  };

  const winnerText = game.winner
    ? game.winner.player === "X"
      ? t("ttt.playerXWins")
      : t("ttt.playerOWins")
    : game.current === "X"
      ? t("ttt.playerXTurn")
      : t("ttt.playerOTurn");

  return (
    <div className="mx-auto max-w-md space-y-5">
      <p className="text-muted text-center text-sm">{t("ttt.subtitle", { s: seconds })}</p>

      <ScoreBoard scores={game.scores} current={game.current} gameOver={game.gameOver} />

      <TimeControl
        lifetimeMs={game.lifetimeMs}
        onLifetimeChange={game.setLifetime}
        onRestart={handleRestart}
      />

      <div className="flex justify-center pt-1">
        <Board
          board={game.board}
          winningLine={game.winner?.line}
          disabled={game.gameOver}
          frozen={game.gameOver}
          lifetimeMs={game.lifetimeMs}
          onPlay={game.play}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={game.resetScores}
        className="text-muted mx-auto flex"
      >
        <Icon name="RotateCcw" size={15} /> {t("ttt.resetScores")}
      </Button>

      {/* Winner popup */}
      <Modal open={showResult} onClose={() => setResultClosed(true)} hideClose className="max-w-xs">
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <motion.div
            initial={{ scale: 0.5, rotate: -12, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-2xl text-white",
              game.winner?.player === "X"
                ? "from-primary bg-gradient-to-br to-indigo-400"
                : "from-accent bg-gradient-to-br to-pink-400",
            )}
          >
            <Icon name="Sparkles" size={30} />
          </motion.div>
          <h2 className="text-xl font-bold">{winnerText}</h2>
          <p className="text-muted text-sm">{t("ttt.niceGame")}</p>
          <Button onClick={handleRestart} className="mt-2 w-full">
            <Icon name="Play" size={16} /> {t("ttt.playAgain")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
