"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody, Button, Modal, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useWheel } from "./hooks/useWheel";
import { Wheel } from "./components/Wheel";
import { EntryList } from "./components/EntryList";
import { PresetBar } from "./components/PresetBar";
import type { WheelEntry } from "./types";

export default function WheelSpinnerPage() {
  const wheel = useWheel();
  const { t } = useTranslation();
  const [winner, setWinner] = useState<WheelEntry | null>(null);
  const [winners, setWinners] = useState<string[]>([]);

  const handleResult = (entry: WheelEntry) => {
    setWinner(entry);
    if (wheel.settings.removeWinner) {
      setWinners((w) => [entry.label, ...w]);
      wheel.removeEntry(entry.id);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Wheel + entries */}
      <div className="space-y-6">
        <Card>
          <CardBody className="flex flex-col items-center gap-4">
            <Wheel
              entries={wheel.entries}
              soundEnabled={wheel.settings.soundEnabled}
              instantResult={wheel.settings.instantResult}
              onResult={handleResult}
            />
            {!wheel.canSpin && <p className="text-muted text-sm">{t("wheel.addTwo")}</p>}
          </CardBody>
        </Card>

        {/* Past winners (only meaningful when winners are removed after each spin) */}
        {wheel.settings.removeWinner && winners.length > 0 && (
          <Card>
            <CardBody className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">{t("wheel.winners")}</h3>
                <Button variant="ghost" size="sm" onClick={() => setWinners([])}>
                  <Icon name="Trash2" size={15} /> {t("wheel.clearWinners")}
                </Button>
              </div>
              <ol className="space-y-1.5">
                {winners.map((w, i) => (
                  <li
                    key={`${w}-${i}`}
                    className="border-border bg-surface flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                  >
                    <span className="bg-surface-2 text-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums">
                      {winners.length - i}
                    </span>
                    <span className="truncate font-medium">{w}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardBody>
            <EntryList
              entries={wheel.entries}
              onAdd={wheel.addEntry}
              onAddMany={wheel.addMany}
              onEdit={wheel.editEntry}
              onRemove={wheel.removeEntry}
              onClear={wheel.clearEntries}
              onShuffle={wheel.shuffleEntries}
            />
          </CardBody>
        </Card>
      </div>

      {/* Presets + settings */}
      <Card className="h-fit">
        <CardBody>
          <PresetBar
            presets={wheel.presets}
            settings={wheel.settings}
            activeName={wheel.activeName}
            hasEntries={wheel.entries.length > 0}
            onSave={wheel.savePreset}
            onLoad={wheel.loadPreset}
            onDelete={wheel.deletePreset}
            onSettings={wheel.setSettings}
            onAddNumbers={(n) => wheel.addMany(Array.from({ length: n }, (_, i) => String(i + 1)))}
          />
        </CardBody>
      </Card>

      {/* Winner popup */}
      <Modal open={winner !== null} onClose={() => setWinner(null)} hideClose className="max-w-sm">
        <div className="flex flex-col items-center gap-3 py-3 text-center">
          <motion.div
            initial={{ scale: 0.4, rotate: -20, opacity: 0 }}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 280, damping: 16 }}
            className="from-primary to-accent flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white"
          >
            <Icon name="Sparkles" size={30} />
          </motion.div>
          <p className="text-muted text-sm">{t("wheel.theWinnerIs")}</p>
          <h2 className="text-2xl font-bold break-words">{winner?.label}</h2>
          <Button onClick={() => setWinner(null)} className="mt-2 w-full">
            {t("wheel.spinAgain")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
