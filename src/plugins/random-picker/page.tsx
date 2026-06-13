"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Input, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

type Mode = "number" | "list";

export default function RandomPickerPage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("number");
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "number", label: t("rp.tabNumber") },
            { value: "list", label: t("rp.tabList") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      {mode === "number" ? <NumberDraw /> : <ListPick />}
    </div>
  );
}

function NumberDraw() {
  const { t } = useTranslation();
  const [min, setMin] = useState("1");
  const [max, setMax] = useState("100");
  const [result, setResult] = useState<number | null>(null);
  const [spin, setSpin] = useState(0);

  const draw = () => {
    const lo = Math.ceil(Number(min) || 0);
    const hi = Math.floor(Number(max) || 0);
    const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
    setResult(Math.floor(Math.random() * (b - a + 1)) + a);
    setSpin((s) => s + 1);
  };

  return (
    <Card>
      <CardBody className="space-y-5">
        <div className="flex items-end gap-3">
          <label className="flex-1 space-y-1.5">
            <span className="text-muted text-sm">{t("rp.min")}</span>
            <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} />
          </label>
          <label className="flex-1 space-y-1.5">
            <span className="text-muted text-sm">{t("rp.max")}</span>
            <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} />
          </label>
        </div>
        <motion.div
          key={spin}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-primary text-center text-6xl font-extrabold tabular-nums"
        >
          {result ?? "—"}
        </motion.div>
        <Button size="lg" onClick={draw} className="w-full">
          <Icon name="Shuffle" size={18} /> {t("rp.draw")}
        </Button>
      </CardBody>
    </Card>
  );
}

function ListPick() {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const [winner, setWinner] = useState<string | null>(null);
  const [spin, setSpin] = useState(0);

  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const pick = () => {
    if (items.length === 0) return;
    setWinner(items[Math.floor(Math.random() * items.length)]);
    setSpin((s) => s + 1);
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={t("rp.itemsPlaceholder")}
          className="border-border bg-surface focus-visible:border-primary focus-visible:ring-ring w-full resize-none rounded-xl border p-3 text-sm outline-none focus-visible:ring-2"
        />
        {winner && (
          <motion.div
            key={spin}
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="from-primary/10 to-accent/10 rounded-xl bg-gradient-to-br p-4 text-center"
          >
            <div className="text-muted text-xs">{t("rp.result")}</div>
            <div className="text-primary text-2xl font-extrabold break-words">{winner}</div>
          </motion.div>
        )}
        <Button size="lg" onClick={pick} disabled={items.length === 0} className="w-full">
          <Icon name="Target" size={18} /> {t("rp.pick")} ({items.length})
        </Button>
      </CardBody>
    </Card>
  );
}
