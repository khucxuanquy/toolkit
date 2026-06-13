"use client";

import { useSoundStore } from "@/core/services/sound-store";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { Icon } from "./Icon";

/** Toggles app-wide sound effects on/off. */
export function SoundToggle() {
  const enabled = useSoundStore((s) => s.enabled);
  const toggle = useSoundStore((s) => s.toggle);
  const { t } = useTranslation();

  return (
    <button
      onClick={() => {
        toggle();
        // Give audible feedback when turning sound on.
        if (!enabled) sound.click();
      }}
      aria-pressed={enabled}
      aria-label={enabled ? t("nav.soundOff") : t("nav.soundOn")}
      title={enabled ? t("nav.soundOff") : t("nav.soundOn")}
      className="border-border bg-surface text-foreground hover:bg-surface-2 flex h-10 w-10 items-center justify-center rounded-xl border transition-colors"
    >
      <Icon name={enabled ? "Volume2" : "VolumeX"} size={18} />
    </button>
  );
}
