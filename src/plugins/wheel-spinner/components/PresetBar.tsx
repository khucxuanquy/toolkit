"use client";

import { useState } from "react";
import { Button, Input, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import type { WheelPreset, WheelSettings } from "../types";

interface PresetBarProps {
  presets: WheelPreset[];
  settings: WheelSettings;
  activeName: string;
  hasEntries: boolean;
  onSave: (name: string) => void;
  onLoad: (preset: WheelPreset) => void;
  onDelete: (id: string) => void;
  onSettings: (change: Partial<WheelSettings>) => void;
  onAddNumbers: (count: number) => void;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 text-sm"
    >
      <span className="text-left">{label}</span>
      <span
        className={cn(
          "relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked && "translate-x-4",
          )}
        />
      </span>
    </button>
  );
}

export function PresetBar({
  presets,
  settings,
  activeName,
  hasEntries,
  onSave,
  onLoad,
  onDelete,
  onSettings,
  onAddNumbers,
}: PresetBarProps) {
  const toast = useToast();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [count, setCount] = useState("10");

  // Localized fallback name when the wheel hasn't been explicitly named.
  const defaultName = t("wheel.defaultName");

  const handleSave = () => {
    const presetName = name.trim() || activeName || defaultName;
    onSave(presetName);
    setName("");
    toast(t("wheel.saved", { name: presetName }), "success");
  };

  const handleAddNumbers = () => {
    const n = Math.min(200, Math.max(1, Math.floor(Number(count) || 0)));
    if (n >= 1) onAddNumbers(n);
  };

  return (
    <div className="space-y-5">
      {/* Quick fill 1..N (merged from the old Random Picker) */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("wheel.quickNumbers")}</h3>
        <div className="flex gap-2">
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-label={t("wheel.quickNumbers")}
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleAddNumbers}
            aria-label={t("wheel.fill")}
          >
            <Icon name="Plus" size={18} />
          </Button>
        </div>
        <p className="text-muted text-xs">{t("wheel.quickNumbersHint")}</p>
      </div>

      {/* Save current wheel */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("wheel.saveThisWheel")}</h3>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={activeName || defaultName}
          />
          <Button
            size="icon"
            onClick={handleSave}
            disabled={!hasEntries}
            aria-label={t("wheel.savePreset")}
          >
            <Icon name="Plus" size={18} />
          </Button>
        </div>
      </div>

      {/* Saved presets */}
      {presets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold">{t("wheel.savedWheels")}</h3>
          <ul className="space-y-1.5">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="border-border bg-surface flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <button
                  onClick={() => onLoad(preset)}
                  className="hover:text-primary flex-1 truncate text-left font-medium"
                >
                  {preset.name}
                </button>
                <span className="text-muted text-xs">{preset.entries.length}</span>
                <button
                  onClick={() => onDelete(preset.id)}
                  aria-label={t("wheel.deletePreset", { name: preset.name })}
                  className="text-muted hover:text-danger"
                >
                  <Icon name="Trash2" size={15} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Settings */}
      <div className="border-border space-y-3 border-t pt-4">
        <Toggle
          label={t("wheel.instantResult")}
          checked={!!settings.instantResult}
          onChange={(v) => onSettings({ instantResult: v })}
        />
        <Toggle
          label={t("wheel.removeWinnerAfter")}
          checked={settings.removeWinner}
          onChange={(v) => onSettings({ removeWinner: v })}
        />
        <Toggle
          label={t("wheel.soundEffects")}
          checked={settings.soundEnabled}
          onChange={(v) => onSettings({ soundEnabled: v })}
        />
      </div>
    </div>
  );
}
