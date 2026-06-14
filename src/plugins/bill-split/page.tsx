"use client";

import { useState } from "react";
import { Card, CardBody, Input, Icon, Button } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { cn } from "@/shared/utils/cn";

interface BillItem {
  id: string;
  label: string;
  amount: string;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));
let counter = 0;
const newItem = (): BillItem => ({ id: `b-${++counter}`, label: "", amount: "" });

export default function BillSplitPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<BillItem[]>([newItem()]);
  const [people, setPeople] = useState(2);
  const [roundUp, setRoundUp] = useState(true);

  const subtotal = items.reduce((sum, it) => sum + Math.max(0, parseFloat(it.amount) || 0), 0);
  const rawPer = people > 0 ? subtotal / people : 0;
  const perPerson = roundUp ? Math.ceil(rawPer / 1000) * 1000 : rawPer;

  const updateItem = (id: string, change: Partial<BillItem>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...change } : it)));
  const addItem = () => {
    sound.click();
    setItems((list) => [...list, newItem()]);
  };
  const removeItem = (id: string) =>
    setItems((list) => (list.length > 1 ? list.filter((it) => it.id !== id) : list));

  return (
    <div className="mx-auto grid max-w-4xl gap-5 md:grid-cols-2">
      {/* Inputs */}
      <Card>
        <CardBody className="space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t("bill.bills")}</span>
              <Button variant="ghost" size="sm" onClick={addItem}>
                <Icon name="Plus" size={15} /> {t("bill.addBill")}
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={it.id} className="flex gap-2">
                  <Input
                    value={it.label}
                    onChange={(e) => updateItem(it.id, { label: e.target.value })}
                    placeholder={`${t("bill.bill")} ${i + 1}`}
                    className="w-28 shrink-0"
                    aria-label={t("bill.billLabel")}
                  />
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={it.amount}
                      onChange={(e) => updateItem(it.id, { amount: e.target.value })}
                      placeholder="0"
                      className="pr-8 text-right"
                      aria-label={t("bill.amount")}
                    />
                    <span className="text-muted absolute top-1/2 right-3 -translate-y-1/2 text-sm">
                      đ
                    </span>
                  </div>
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={items.length <= 1}
                    aria-label={t("bill.removeBill")}
                    className="text-muted hover:bg-surface-2 hover:text-danger flex h-10 w-10 shrink-0 items-center justify-center rounded-lg disabled:opacity-30"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-border flex justify-between border-t pt-3 text-sm">
              <span className="text-muted">{t("bill.subtotal")}</span>
              <span className="font-bold tabular-nums">{fmt(subtotal)} đ</span>
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
            <Row label={t("bill.bills")} value={`${items.length}`} />
            <Row label={t("bill.total")} value={`${fmt(subtotal)} đ`} bold />
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
