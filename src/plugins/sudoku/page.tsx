"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, Card, CardBody, Icon, Modal } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { cn } from "@/shared/utils/cn";
import { conflicts, generate, isComplete, remainingCounts, type Difficulty } from "./logic";
import { sudokuStorage, type SavedGame } from "./storage";

const DIFFS: Difficulty[] = ["easy", "medium", "hard"];

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function newGame(difficulty: Difficulty): SavedGame {
  const { puzzle, solution } = generate(difficulty);
  return {
    difficulty,
    puzzle,
    solution,
    cells: [...puzzle],
    notes: Array.from({ length: 81 }, () => []),
    elapsed: 0,
    mistakes: 0,
  };
}

export default function SudokuPage() {
  const { t } = useTranslation();
  const [game, setGame] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [won, setWon] = useState(false);
  const [best, setBest] = useState<Record<string, number>>({});
  const tick = useRef(0);

  // Load any saved game + best times once.
  useEffect(() => {
    let active = true;
    void Promise.all([sudokuStorage.loadGame(), sudokuStorage.loadBest()]).then(([g, b]) => {
      if (!active) return;
      setGame(g);
      setBest(b);
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const bad = game ? conflicts(game.cells) : new Set<number>();
  const solved = game ? isComplete(game.cells) : false;

  // Timer — ticks while a game is active and unsolved.
  useEffect(() => {
    if (!game || solved) return;
    const id = setInterval(() => {
      setGame((g) => (g ? { ...g, elapsed: g.elapsed + 1 } : g));
      tick.current += 1;
      if (tick.current % 5 === 0) {
        setGame((g) => {
          if (g) void sudokuStorage.saveGame(g);
          return g;
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [game === null, solved]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((difficulty: Difficulty) => {
    const g = newGame(difficulty);
    setGame(g);
    setSelected(null);
    setWon(false);
    void sudokuStorage.saveGame(g);
  }, []);

  const recordWin = useCallback(
    (g: SavedGame) => {
      sound.win();
      setBest((prev) => {
        const key = g.difficulty;
        const next = { ...prev };
        if (!next[key] || g.elapsed < next[key]) next[key] = g.elapsed;
        void sudokuStorage.saveBest(next);
        return next;
      });
      void sudokuStorage.clearGame();
      setWon(true);
    },
    [],
  );

  const place = useCallback(
    (val: number) => {
      if (selected === null || !game) return;
      if (game.puzzle[selected] !== 0) return; // given cell — locked

      setGame((g) => {
        if (!g) return g;
        const cells = [...g.cells];
        const notes = g.notes.map((n) => [...n]);

        if (noteMode && val !== 0) {
          const set = new Set(notes[selected]);
          if (set.has(val)) set.delete(val);
          else set.add(val);
          notes[selected] = [...set].sort();
          const ng = { ...g, notes };
          void sudokuStorage.saveGame(ng);
          return ng;
        }

        const prev = cells[selected];
        cells[selected] = val;
        notes[selected] = [];
        let mistakes = g.mistakes;
        if (val !== 0 && val !== g.solution[selected] && val !== prev) {
          mistakes += 1;
          sound.lose();
        } else if (val !== 0) {
          sound.place();
        }
        const ng = { ...g, cells, notes, mistakes };
        void sudokuStorage.saveGame(ng);
        if (isComplete(ng.cells)) recordWin(ng);
        return ng;
      });
    },
    [selected, game, noteMode, recordWin],
  );

  // Keyboard support.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!game || selected === null) return;
      if (e.key >= "1" && e.key <= "9") place(Number(e.key));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") place(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, selected, place]);

  if (!loaded) {
    return (
      <div className="flex justify-center py-24">
        <Icon name="Loader2" size={28} className="text-muted animate-spin" />
      </div>
    );
  }

  // Start screen.
  if (!game) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardBody className="space-y-5 py-8 text-center">
          <Icon name="Grid3x3" size={36} className="text-primary mx-auto" />
          <h2 className="text-lg font-bold">Sudoku</h2>
          <p className="text-muted text-sm">{t("su.pickDifficulty")}</p>
          <div className="space-y-2">
            {DIFFS.map((d) => (
              <Button key={d} className="w-full justify-between" variant="outline" onClick={() => start(d)}>
                <span>{t(`su.${d}`)}</span>
                {best[d] && <span className="text-muted text-xs">{t("su.best")}: {fmtTime(best[d])}</span>}
              </Button>
            ))}
          </div>
        </CardBody>
      </Card>
    );
  }

  const counts = remainingCounts(game.cells);
  const selectedVal = selected !== null ? game.cells[selected] : 0;

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between text-sm">
        <span className="bg-surface-2 rounded-lg px-2.5 py-1 font-medium capitalize">
          {t(`su.${game.difficulty}`)}
        </span>
        <div className="flex items-center gap-3">
          <span className={cn("flex items-center gap-1", game.mistakes > 0 && "text-danger")}>
            <Icon name="X" size={14} /> {game.mistakes}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <Icon name="Timer" size={14} /> {fmtTime(game.elapsed)}
          </span>
        </div>
      </div>

      {/* Board */}
      <div className="bg-border grid aspect-square grid-cols-9 overflow-hidden rounded-xl border-2 border-border">
        {game.cells.map((val, i) => {
          const given = game.puzzle[i] !== 0;
          const r = Math.floor(i / 9);
          const c = i % 9;
          const isSel = selected === i;
          const sameVal = val !== 0 && val === selectedVal;
          const peer =
            selected !== null &&
            (Math.floor(selected / 9) === r ||
              selected % 9 === c ||
              (Math.floor(Math.floor(selected / 9) / 3) === Math.floor(r / 3) &&
                Math.floor((selected % 9) / 3) === Math.floor(c / 3)));
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              className={cn(
                "relative flex items-center justify-center bg-surface text-lg font-semibold transition-colors",
                "border-border/60 border-r border-b",
                c % 3 === 2 && c !== 8 && "border-r-2 border-r-border",
                r % 3 === 2 && r !== 8 && "border-b-2 border-b-border",
                peer && !isSel && "bg-surface-2",
                sameVal && !isSel && "bg-primary/15",
                isSel && "bg-primary/25",
                given ? "text-foreground" : "text-primary",
                bad.has(i) && "text-danger bg-danger/10",
              )}
            >
              {val !== 0 ? (
                val
              ) : game.notes[i].length > 0 ? (
                <span className="grid grid-cols-3 gap-px p-0.5 text-[8px] leading-none text-muted">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span key={n} className="flex h-2 w-2 items-center justify-center">
                      {game.notes[i].includes(n) ? n : ""}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        <Button variant={noteMode ? "primary" : "outline"} size="sm" onClick={() => setNoteMode((v) => !v)}>
          <Icon name="Pencil" size={16} /> {t("su.notes")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => place(0)} disabled={selected === null}>
          <Icon name="Eraser" size={16} /> {t("su.erase")}
        </Button>
        <Button variant="outline" size="sm" onClick={() => setGame(null)}>
          <Icon name="RotateCcw" size={16} /> {t("su.newGame")}
        </Button>
      </div>

      {/* Number pad */}
      <div className="grid grid-cols-9 gap-1">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
          const left = counts[n];
          return (
            <button
              key={n}
              onClick={() => place(n)}
              disabled={selected === null || left <= 0}
              className={cn(
                "bg-surface hover:bg-surface-2 flex flex-col items-center rounded-lg border border-border py-2 text-lg font-bold transition-colors disabled:opacity-40",
              )}
            >
              {n}
              <span className="text-muted text-[10px] font-normal">{left}</span>
            </button>
          );
        })}
      </div>

      <Modal open={won} onClose={() => setGame(null)} title={t("su.solved")} className="max-w-xs">
        <div className="space-y-4 text-center">
          <Icon name="Trophy" size={40} className="text-warning mx-auto" />
          <p className="text-sm">
            {t("su.solvedMsg", { time: fmtTime(game.elapsed) })}
            {best[game.difficulty] === game.elapsed && (
              <span className="text-primary block font-semibold">{t("su.newBest")}</span>
            )}
          </p>
          <Button className="w-full" onClick={() => setGame(null)}>
            {t("su.newGame")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
