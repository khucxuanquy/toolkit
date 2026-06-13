"use client";

import { useState } from "react";
import { Card, CardBody, Input, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";

const TIP_PRESETS = [0, 5, 10, 15, 20];
const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));

export default function BillSplitPage() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState(10);
  const [people, setPeople] = useState(2);
  const [roundUp, setRoundUp] = useState(true);

  const bill = Math.max(0, parseFloat(amount) || 0);
  const tipAmount = (bill * tip) / 100;
  const total = bill + tipAmount;
  const rawPer = people > 0 ? total / people : 0;
  const perPerson = roundUp ? Math.ceil(rawPer / 1000) * 1000 : rawPer;

  return (
    <div className="mx-auto grid max-w-2xl gap-5 md:grid-cols-2">
      {/* Inputs */}
      <Card>
        <CardBody className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium">{t("bill.amount")}</span>
            <div className="relative">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="pr-8 text-lg"
              />
              <span className="text-muted absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                đ
              </span>
            </div>
          </label>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">
              {t("bill.tip")} ({tip}%)
            </span>
            <div className="flex flex-wrap gap-2">
              {TIP_PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setTip(p)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    tip === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-surface-2 hover:bg-border",
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm font-medium">{t("bill.people")}</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPeople((n) => Math.max(1, n - 1))}
                className="bg-surface-2 hover:bg-border flex h-10 w-10 items-center justify-center rounded-lg"
                aria-label="-"
              >
                <Icon name="Minus" size={16} />
              </button>
              <span className="w-10 text-center text-2xl font-bold tabular-nums">{people}</span>
              <button
                onClick={() => setPeople((n) => Math.min(99, n + 1))}
                className="bg-surface-2 hover:bg-border flex h-10 w-10 items-center justify-center rounded-lg"
                aria-label="+"
              >
                <Icon name="Plus" size={16} />
              </button>
            </div>
          </div>

          <button
            onClick={() => setRoundUp((v) => !v)}
            role="switch"
            aria-checked={roundUp}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span>{t("bill.roundUp")}</span>
            <span
              className={cn(
                "relative h-5 w-9 rounded-full transition-colors",
                roundUp ? "bg-primary" : "bg-border",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  roundUp && "translate-x-4",
                )}
              />
            </span>
          </button>
        </CardBody>
      </Card>

      {/* Result */}
      <Card className="from-primary/10 to-accent/10 bg-gradient-to-br">
        <CardBody className="flex h-full flex-col justify-center gap-5 text-center">
          <div>
            <div className="text-muted text-sm">{t("bill.perPerson")}</div>
            <div className="text-primary mt-1 text-4xl font-extrabold tabular-nums">
              {fmt(perPerson)} đ
            </div>
          </div>
          <div className="border-border space-y-2 border-t pt-4 text-sm">
            <Row label={t("bill.tipAmount")} value={`${fmt(tipAmount)} đ`} />
            <Row label={t("bill.total")} value={`${fmt(total)} đ`} bold />
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("tabular-nums", bold && "font-bold")}>{value}</span>
    </div>
  );
}
