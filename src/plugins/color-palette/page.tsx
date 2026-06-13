"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

interface Swatch {
  hex: string;
  locked: boolean;
}

function randomHex(): string {
  const n = Math.floor(Math.random() * 0xffffff);
  return "#" + n.toString(16).padStart(6, "0").toUpperCase();
}

/** Pick black or white text for contrast against a hex background. */
function textColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#000000" : "#FFFFFF";
}

export default function ColorPalettePage() {
  const { t } = useTranslation();
  const toast = useToast();
  // Client-only plugin (ssr:false) → safe to randomise at init.
  const [colors, setColors] = useState<Swatch[]>(() =>
    Array.from({ length: 5 }, () => ({ hex: randomHex(), locked: false })),
  );

  const generate = useCallback(() => {
    setColors((cs) => cs.map((c) => (c.locked ? c : { ...c, hex: randomHex() })));
  }, []);

  const toggleLock = (i: number) =>
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, locked: !c.locked } : c)));

  const copy = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast(t("cp.copied", { hex }), "success");
    } catch {
      /* ignore */
    }
  };

  // Spacebar regenerates.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement)?.tagName !== "INPUT") {
        e.preventDefault();
        generate();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generate]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {colors.map((c, i) => {
          const fg = textColor(c.hex);
          return (
            <div
              key={i}
              className="flex h-40 flex-col items-center justify-between rounded-2xl p-3 shadow-sm transition-colors sm:h-56"
              style={{ backgroundColor: c.hex, color: fg }}
            >
              <button
                onClick={() => toggleLock(i)}
                aria-label={t("cp.lock")}
                className="self-end rounded-lg p-1.5 transition-opacity hover:opacity-70"
              >
                <Icon name={c.locked ? "Lock" : "LockOpen"} size={18} />
              </button>
              <button
                onClick={() => copy(c.hex)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono font-bold hover:opacity-70"
              >
                {c.hex} <Icon name="Copy" size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center">
        <Button size="lg" onClick={generate} className="w-56">
          <Icon name="Shuffle" size={18} /> {t("cp.generate")}
        </Button>
      </div>
      <p className="text-muted text-center text-sm">{t("cp.hint")}</p>
    </div>
  );
}
