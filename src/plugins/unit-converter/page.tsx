"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Input, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { convert, fmt, RATES_API, UNITS, type Category, type Rates } from "./logic";
import { unitStorage } from "./storage";

const DEFAULTS: Record<Category, [string, string]> = {
  length: ["m", "ft"],
  weight: ["kg", "lb"],
  temperature: ["°C", "°F"],
  currency: ["USD", "VND"],
};

export default function UnitConverterPage() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<Category>("length");
  const [from, setFrom] = useState("m");
  const [to, setTo] = useState("ft");
  const [value, setValue] = useState("1");
  const [rates, setRates] = useState<Rates | null>(null);

  const changeCategory = (c: Category) => {
    setCategory(c);
    setFrom(DEFAULTS[c][0]);
    setTo(DEFAULTS[c][1]);
  };

  // Load currency rates (cached first, then refresh) — all setState after await.
  useEffect(() => {
    if (category !== "currency" || rates) return;
    let active = true;
    void (async () => {
      const cached = await unitStorage.loadRates();
      if (active && cached) setRates(cached.rates);
      try {
        const res = await fetch(RATES_API);
        const data = (await res.json()) as { rates?: Rates };
        if (active && data?.rates) {
          setRates(data.rates);
          await unitStorage.saveRates(data.rates);
        }
      } catch {
        /* offline — keep cached rates if any */
      }
    })();
    return () => {
      active = false;
    };
  }, [category, rates]);

  const num = parseFloat(value);
  const result = Number.isFinite(num) ? convert(category, from, to, num, rates) : NaN;
  const units = UNITS[category];
  const currencyNotReady = category === "currency" && !rates;

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const selectCls =
    "h-10 rounded-xl border border-border bg-surface px-2 text-sm outline-none focus-visible:border-primary";

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <div className="flex justify-center">
        <Tabs<Category>
          items={[
            { value: "length", label: t("uc.length") },
            { value: "weight", label: t("uc.weight") },
            { value: "temperature", label: t("uc.temperature") },
            { value: "currency", label: t("uc.currency") },
          ]}
          value={category}
          onChange={changeCategory}
        />
      </div>

      <Card>
        <CardBody className="space-y-4">
          {currencyNotReady ? (
            <p className="text-muted py-10 text-center text-sm">{t("uc.currencyOffline")}</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="text-muted text-sm">{t("uc.from")}</span>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="flex-1 text-lg"
                  />
                  <select
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    className={selectCls}
                  >
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={swap}
                  aria-label={t("uc.swap")}
                  className="bg-surface-2 hover:bg-border text-muted flex h-9 w-9 items-center justify-center rounded-full"
                >
                  <Icon name="ArrowLeftRight" size={16} />
                </button>
              </div>

              <div className="space-y-1.5">
                <span className="text-muted text-sm">{t("uc.to")}</span>
                <div className="flex gap-2">
                  <div className="bg-surface-2 flex flex-1 items-center rounded-xl px-3 text-lg font-bold tabular-nums">
                    {fmt(result)}
                  </div>
                  <select value={to} onChange={(e) => setTo(e.target.value)} className={selectCls}>
                    {units.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
