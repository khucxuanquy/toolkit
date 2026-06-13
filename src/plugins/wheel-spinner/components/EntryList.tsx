"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { colorForIndex } from "../logic";
import type { WheelEntry } from "../types";

const addSchema = z.object({
  value: z.string().trim().min(1),
});
type AddForm = z.infer<typeof addSchema>;

interface EntryListProps {
  entries: WheelEntry[];
  onAdd: (label: string) => void;
  onAddMany: (labels: string[]) => void;
  onEdit: (id: string, change: { label?: string; weight?: number }) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onShuffle: () => void;
}

export function EntryList({
  entries,
  onAdd,
  onAddMany,
  onEdit,
  onRemove,
  onClear,
  onShuffle,
}: EntryListProps) {
  const { t } = useTranslation();
  const { register, handleSubmit, reset, formState } = useForm<AddForm>({
    resolver: zodResolver(addSchema),
    defaultValues: { value: "" },
  });

  const submit = handleSubmit(({ value }) => {
    // Allow bulk entry: split on new lines or commas.
    const parts = value
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 1) onAddMany(parts);
    else onAdd(parts[0] ?? value);
    reset({ value: "" });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("wheel.entriesCount", { n: entries.length })}</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={onShuffle} disabled={entries.length < 2}>
            <Icon name="Shuffle" size={15} /> {t("wheel.shuffle")}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={entries.length === 0}>
            <Icon name="Trash2" size={15} /> {t("wheel.clear")}
          </Button>
        </div>
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <div className="flex-1">
          <Input
            {...register("value")}
            placeholder={t("wheel.addPlaceholder")}
            autoComplete="off"
          />
          {formState.errors.value && (
            <p className="text-danger mt-1 text-xs">{t("wheel.enterName")}</p>
          )}
        </div>
        <Button type="submit" size="icon" aria-label={t("wheel.addEntry")}>
          <Icon name="Plus" size={18} />
        </Button>
      </form>

      <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
        {entries.map((entry, i) => (
          <li
            key={entry.id}
            className="border-border bg-surface flex items-center gap-2 rounded-lg border px-2 py-1.5"
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: colorForIndex(i) }}
            />
            <input
              value={entry.label}
              onChange={(e) => onEdit(entry.id, { label: e.target.value })}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              aria-label={t("wheel.entryName")}
            />
            {/* Weight stepper */}
            <div className="text-muted flex items-center gap-1">
              <button
                onClick={() => onEdit(entry.id, { weight: entry.weight - 1 })}
                disabled={entry.weight <= 1}
                className="hover:bg-surface-2 flex h-6 w-6 items-center justify-center rounded disabled:opacity-40"
                aria-label={t("wheel.decreaseWeight")}
              >
                −
              </button>
              <span className="w-5 text-center text-xs tabular-nums" title={t("wheel.weight")}>
                {entry.weight}
              </span>
              <button
                onClick={() => onEdit(entry.id, { weight: entry.weight + 1 })}
                className="hover:bg-surface-2 flex h-6 w-6 items-center justify-center rounded"
                aria-label={t("wheel.increaseWeight")}
              >
                +
              </button>
            </div>
            <button
              onClick={() => onRemove(entry.id)}
              className="text-muted hover:bg-surface-2 hover:text-danger flex h-6 w-6 items-center justify-center rounded"
              aria-label={t("wheel.removeEntry", { label: entry.label })}
            >
              <Icon name="X" size={15} />
            </button>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-muted py-6 text-center text-sm">{t("wheel.noEntries")}</li>
        )}
      </ul>
    </div>
  );
}
