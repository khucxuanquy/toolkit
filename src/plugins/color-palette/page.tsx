"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Icon, Tabs, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { harmonies, hexToHsl, normalizeHex, randomHex, shades, textColor } from "./color";

type Mode = "palette" | "matcher";

export default function ColorPalettePage() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("palette");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex justify-center">
        <Tabs<Mode>
          items={[
            { value: "palette", label: t("cp.tabPalette") },
            { value: "matcher", label: t("cp.tabMatcher") },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>
      {mode === "palette" ? <PaletteGenerator /> : <ColorMatcher />}
    </div>
  );
}

/* --------------------------- Random palette --------------------------- */
interface Swatch {
  hex: string;
  locked: boolean;
}

function PaletteGenerator() {
  const { t } = useTranslation();
  const [colors, setColors] = useState<Swatch[]>(() =>
    Array.from({ length: 5 }, () => ({ hex: randomHex(), locked: false })),
  );

  const generate = useCallback(() => {
    setColors((cs) => cs.map((c) => (c.locked ? c : { ...c, hex: randomHex() })));
  }, []);

  const toggleLock = (i: number) =>
    setColors((cs) => cs.map((c, j) => (j === i ? { ...c, locked: !c.locked } : c)));

  const copy = useCopyHex();

  // Spacebar regenerates (ignored while typing in an input).
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
    <div className="space-y-5">
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
                onClick={() => void copy(c.hex)}
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

/* ----------------------------- Matcher ----------------------------- */
function ColorMatcher() {
  const { t } = useTranslation();
  const copy = useCopyHex();
  const [base, setBase] = useState("#6366F1");
  const [text, setText] = useState("#6366F1");

  const applyText = (value: string) => {
    setText(value);
    const norm = normalizeHex(value);
    if (norm) setBase(norm);
  };
  const applyPicker = (value: string) => {
    const norm = normalizeHex(value) ?? value;
    setBase(norm);
    setText(norm);
  };

  const harm = useMemo(() => harmonies(base), [base]);
  const scale = useMemo(() => shades(base), [base]);
  const fg = textColor(base);
  const [, , l] = hexToHsl(base);

  return (
    <div className="space-y-6">
      {/* Picker */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <label className="border-border relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl border shadow-sm">
          <span className="block h-full w-full" style={{ backgroundColor: base }} />
          <input
            type="color"
            value={base}
            onChange={(e) => applyPicker(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label={t("cp.pickColor")}
          />
        </label>
        <div className="space-y-1">
          <span className="text-muted text-xs">{t("cp.pickColor")}</span>
          <div className="flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => applyText(e.target.value)}
              spellCheck={false}
              className="border-border bg-surface focus-visible:border-primary h-10 w-32 rounded-xl border px-3 font-mono text-sm uppercase outline-none"
              aria-label={t("cp.pickColor")}
            />
            <button
              onClick={() => void copy(base)}
              className="text-muted hover:text-foreground flex h-10 w-10 items-center justify-center rounded-xl"
              aria-label="Copy"
            >
              <Icon name="Copy" size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Matching colours */}
      <section className="space-y-2">
        <h3 className="text-muted text-sm font-semibold tracking-wide uppercase">
          {t("cp.matches")}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <MatchSwatch label={t("cp.complementary")} hex={harm.complementary} onCopy={copy} />
          <MatchSwatch label={t("cp.analogous")} hex={harm.analogous[0]} onCopy={copy} />
          <MatchSwatch label={t("cp.analogous")} hex={harm.analogous[1]} onCopy={copy} />
          <MatchSwatch label={t("cp.triadic")} hex={harm.triadic[0]} onCopy={copy} />
          <MatchSwatch label={t("cp.triadic")} hex={harm.triadic[1]} onCopy={copy} />
        </div>
      </section>

      {/* Shades */}
      <section className="space-y-2">
        <h3 className="text-muted text-sm font-semibold tracking-wide uppercase">
          {t("cp.shades")}
        </h3>
        <div className="flex overflow-hidden rounded-xl shadow-sm">
          {scale.map((hex) => (
            <button
              key={hex}
              onClick={() => void copy(hex)}
              title={hex}
              className="group relative h-16 flex-1"
              style={{ backgroundColor: hex }}
            >
              <span
                className="absolute inset-x-0 bottom-1 text-center font-mono text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
                style={{ color: textColor(hex) }}
              >
                {hex.slice(1)}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Live preview */}
      <section className="space-y-2">
        <h3 className="text-muted text-sm font-semibold tracking-wide uppercase">
          {t("cp.preview")}
        </h3>
        <div className="border-border space-y-4 rounded-2xl border p-5">
          {/* Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: base, color: fg }}
            >
              {t("cp.sampleBtnPrimary")}
            </button>
            <button
              className="rounded-xl border-2 bg-transparent px-4 py-2 text-sm font-semibold"
              style={{ borderColor: base, color: base }}
            >
              {t("cp.sampleBtnOutline")}
            </button>
          </div>

          {/* Text on surface */}
          <div>
            <p className="text-lg font-bold" style={{ color: base }}>
              {t("cp.sampleHeading")}
            </p>
            <p className="text-sm">
              {t("cp.sampleText")} <span style={{ color: base }}>#{base.slice(1)}</span>
            </p>
          </div>

          {/* Colour as background */}
          <div className="rounded-xl p-4" style={{ backgroundColor: base, color: fg }}>
            <p className="font-semibold">{t("cp.onColor")}</p>
            <p className="text-sm opacity-90">{t("cp.sampleText")}</p>
          </div>
        </div>
        {l > 0.85 && <p className="text-muted text-xs">{t("cp.lightHint")}</p>}
      </section>
    </div>
  );
}

function MatchSwatch({
  label,
  hex,
  onCopy,
}: {
  label: string;
  hex: string;
  onCopy: (hex: string) => Promise<void>;
}) {
  return (
    <button
      onClick={() => void onCopy(hex)}
      className="flex h-24 flex-col justify-between rounded-xl p-2.5 text-left shadow-sm transition-transform hover:-translate-y-0.5"
      style={{ backgroundColor: hex, color: textColor(hex) }}
    >
      <span className="text-xs font-medium opacity-90">{label}</span>
      <span className="flex items-center gap-1 font-mono text-sm font-bold">
        {hex} <Icon name="Copy" size={12} />
      </span>
    </button>
  );
}

/** Shared "copy hex to clipboard + toast" helper. */
function useCopyHex() {
  const { t } = useTranslation();
  const toast = useToast();
  return useCallback(
    async (hex: string) => {
      try {
        await navigator.clipboard.writeText(hex);
        toast(t("cp.copied", { hex }), "success");
      } catch {
        /* ignore */
      }
    },
    [t, toast],
  );
}
