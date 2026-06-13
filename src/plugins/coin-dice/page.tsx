"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";

type Mode = "coin" | "dice";

export default function CoinDicePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("coin");
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "coin", label: t("cd.tabCoin") },
            { value: "dice", label: t("cd.tabDice") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      <Card>
        <CardBody className="py-8">{mode === "coin" ? <Coin /> : <Dice />}</CardBody>
      </Card>
    </div>
  );
}

function Coin() {
  const { t } = useTranslation();
  const [result, setResult] = useState<"heads" | "tails" | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [counts, setCounts] = useState({ heads: 0, tails: 0 });

  const flip = () => {
    if (flipping) return;
    setFlipping(true);
    const next = Math.random() < 0.5 ? "heads" : "tails";
    setTimeout(() => {
      setResult(next);
      setCounts((c) => ({ ...c, [next]: c[next] + 1 }));
      setFlipping(false);
    }, 700);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        animate={flipping ? { rotateX: [0, 1800] } : {}}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={cn(
          "flex h-32 w-32 items-center justify-center rounded-full text-2xl font-extrabold text-white shadow-lg",
          result === "tails"
            ? "from-accent bg-gradient-to-br to-pink-600"
            : "bg-gradient-to-br from-amber-400 to-yellow-600",
        )}
      >
        {result ? t(result === "heads" ? "cd.heads" : "cd.tails") : "?"}
      </motion.div>
      <Button size="lg" onClick={flip} disabled={flipping} className="w-40">
        <Icon name="Coins" size={18} /> {t("cd.flip")}
      </Button>
      <div className="text-muted flex gap-6 text-sm">
        <span>
          {t("cd.heads")}: <b className="text-foreground tabular-nums">{counts.heads}</b>
        </span>
        <span>
          {t("cd.tails")}: <b className="text-foreground tabular-nums">{counts.tails}</b>
        </span>
      </div>
    </div>
  );
}

// Pip positions (1-9 grid cells) for each die value.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function Die({ value }: { value: number }) {
  return (
    <div className="bg-surface border-border grid h-16 w-16 grid-cols-3 grid-rows-3 gap-0.5 rounded-xl border p-2 shadow-sm sm:h-20 sm:w-20">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "m-auto h-2.5 w-2.5 rounded-full",
            PIPS[value]?.includes(i) ? "bg-primary" : "bg-transparent",
          )}
        />
      ))}
    </div>
  );
}

function Dice() {
  const { t } = useTranslation();
  const [count, setCount] = useState(2);
  const [values, setValues] = useState<number[]>([1, 1]);
  const [rolling, setRolling] = useState(false);

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setTimeout(() => {
      setValues(Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1));
      setRolling(false);
    }, 400);
  };

  const setN = (n: number) => {
    const next = Math.max(1, Math.min(5, n));
    setCount(next);
    setValues((v) => Array.from({ length: next }, (_, i) => v[i] ?? 1));
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        key={values.join("-")}
        initial={{ scale: 0.85, opacity: 0.6 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-wrap justify-center gap-3"
      >
        {values.map((v, i) => (
          <Die key={i} value={v} />
        ))}
      </motion.div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setN(count - 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="-"
        >
          <Icon name="Minus" size={16} />
        </button>
        <span className="text-muted w-24 text-center text-sm">
          {count} {t("cd.diceCount")}
        </span>
        <button
          onClick={() => setN(count + 1)}
          className="bg-surface-2 hover:bg-border flex h-9 w-9 items-center justify-center rounded-lg"
          aria-label="+"
        >
          <Icon name="Plus" size={16} />
        </button>
      </div>

      <Button size="lg" onClick={roll} disabled={rolling} className="w-40">
        <Icon name="Dices" size={18} /> {t("cd.roll")}
      </Button>
      <p className="text-muted text-sm">
        {t("cd.total")}:{" "}
        <b className="text-foreground tabular-nums">{values.reduce((a, b) => a + b, 0)}</b>
      </p>
    </div>
  );
}
