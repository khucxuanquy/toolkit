"use client";

import { useState } from "react";
import { Card, CardBody, Button, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { generatePassword, strength, type PwOptions, type Strength } from "./logic";

const DEFAULTS: PwOptions = { length: 16, upper: true, lower: true, number: true, symbol: true };

const STRENGTH_STYLE: Record<Strength, { bars: number; cls: string }> = {
  weak: { bars: 1, cls: "bg-danger" },
  fair: { bars: 2, cls: "bg-warning" },
  strong: { bars: 3, cls: "bg-primary" },
  veryStrong: { bars: 4, cls: "bg-success" },
};

export default function PasswordGeneratorPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const [opts, setOpts] = useState<PwOptions>(DEFAULTS);
  // Client-only plugin (dynamic ssr:false) → crypto is available at init.
  const [password, setPassword] = useState<string>(() => generatePassword(DEFAULTS));

  const update = (partial: Partial<PwOptions>) => {
    const next = { ...opts, ...partial };
    setOpts(next);
    setPassword(generatePassword(next));
  };

  const regenerate = () => setPassword(generatePassword(opts));

  const copy = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast(t("pw.copied"), "success");
    } catch {
      toast(t("auth.err.generic"), "error");
    }
  };

  const s = strength(opts);
  const style = STRENGTH_STYLE[s];

  const toggles: { key: keyof PwOptions; label: string }[] = [
    { key: "upper", label: t("pw.upper") },
    { key: "lower", label: t("pw.lower") },
    { key: "number", label: t("pw.numbers") },
    { key: "symbol", label: t("pw.symbols") },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Card>
        <CardBody className="space-y-4">
          {/* Output */}
          <div className="bg-surface-2 flex items-center gap-2 rounded-xl p-3">
            <code className="flex-1 font-mono text-lg break-all">{password || "—"}</code>
            <button
              onClick={regenerate}
              aria-label={t("pw.generate")}
              className="text-muted hover:text-foreground hover:bg-border rounded-lg p-2"
            >
              <Icon name="RotateCcw" size={18} />
            </button>
            <button
              onClick={copy}
              aria-label={t("pw.copy")}
              className="text-muted hover:text-foreground hover:bg-border rounded-lg p-2"
            >
              <Icon name="Copy" size={18} />
            </button>
          </div>

          {/* Strength */}
          <div className="space-y-1.5">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i <= style.bars ? style.cls : "bg-border",
                  )}
                />
              ))}
            </div>
            <p className="text-muted text-right text-xs">{t(`pw.${s}`)}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-5">
          <label className="block space-y-2">
            <span className="flex items-center justify-between text-sm font-medium">
              {t("pw.length")}
              <span className="text-primary font-mono">{opts.length}</span>
            </span>
            <input
              type="range"
              min={6}
              max={40}
              value={opts.length}
              onChange={(e) => update({ length: Number(e.target.value) })}
              className="accent-primary w-full cursor-pointer"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            {toggles.map((tg) => (
              <button
                key={tg.key}
                onClick={() => update({ [tg.key]: !opts[tg.key] } as Partial<PwOptions>)}
                role="switch"
                aria-checked={opts[tg.key] as boolean}
                className={cn(
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition-colors",
                  opts[tg.key] ? "border-primary/50 bg-primary/10" : "border-border bg-surface",
                )}
              >
                <span>{tg.label}</span>
                {opts[tg.key] && <Icon name="Check" size={16} className="text-primary" />}
              </button>
            ))}
          </div>

          <Button onClick={regenerate} size="lg" className="w-full">
            <Icon name="RotateCcw" size={18} /> {t("pw.generate")}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
