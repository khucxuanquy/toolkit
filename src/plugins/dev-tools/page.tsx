"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardBody, Button, Icon, Tabs, useToast, type TabItem } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { csvToJson, jsonToCsv, formatJson, SAMPLES, type DevMode } from "./logic";

export default function DevToolsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<DevMode>("csv2json");
  const [minify, setMinify] = useState(false);
  const [input, setInput] = useState("");

  const tabs: TabItem<DevMode>[] = [
    { value: "csv2json", label: t("dev.csv2json") },
    { value: "json2csv", label: t("dev.json2csv") },
    { value: "format", label: t("dev.format") },
  ];

  // Live conversion — recompute whenever input, mode or options change.
  const { output, error } = useMemo(() => {
    if (!input.trim()) return { output: "", error: null as string | null };
    try {
      const out =
        mode === "csv2json"
          ? csvToJson(input)
          : mode === "json2csv"
            ? jsonToCsv(input)
            : formatJson(input, minify);
      return { output: out, error: null as string | null };
    } catch (e) {
      return { output: "", error: (e as Error).message };
    }
  }, [input, mode, minify]);

  const outIsCsv = mode === "json2csv";
  const outName = outIsCsv ? "data.csv" : "data.json";

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;
    try {
      const text = await file.text();
      setInput(text);
      // Auto-pick a sensible mode from the file extension.
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "csv" || ext === "tsv") setMode("csv2json");
      else if (ext === "json") setMode((m) => (m === "csv2json" ? "format" : m));
      toast(t("dev.loaded", { name: file.name }), "success");
    } catch {
      toast(t("dev.readError"), "error");
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast(t("dev.copied"), "success");
    } catch {
      toast(t("dev.copyError"), "error");
    }
  };

  const download = () => {
    if (!output) return;
    const blob = new Blob([output], {
      type: outIsCsv ? "text/csv;charset=utf-8" : "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs items={tabs} value={mode} onChange={setMode} />
        {mode === "format" && (
          <div className="border-border bg-surface-2 inline-flex gap-1 rounded-xl border p-1">
            {[
              { v: false, label: t("dev.beautify") },
              { v: true, label: t("dev.minify") },
            ].map((o) => (
              <button
                key={String(o.v)}
                onClick={() => setMinify(o.v)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  minify === o.v
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Input */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("dev.input")}</h2>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[mode])}>
                  <Icon name="Sparkles" size={15} /> {t("dev.sample")}
                </Button>
                <Button size="sm" variant="ghost" onClick={pickFile}>
                  <Icon name="Upload" size={15} /> {t("dev.upload")}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setInput("")}
                  disabled={!input}
                  aria-label={t("dev.clear")}
                >
                  <Icon name="Trash2" size={15} />
                </Button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder={t(mode === "csv2json" ? "dev.phCsv" : "dev.phJson")}
              className="border-border bg-surface-2 focus:ring-ring h-72 w-full resize-y rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.json,.txt,text/*,application/json"
              onChange={onFile}
              className="hidden"
            />
          </CardBody>
        </Card>

        {/* Output */}
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("dev.output")}</h2>
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={copy} disabled={!output}>
                  <Icon name="Copy" size={15} /> {t("dev.copy")}
                </Button>
                <Button size="sm" variant="ghost" onClick={download} disabled={!output}>
                  <Icon name="Download" size={15} /> {t("dev.download")}
                </Button>
              </div>
            </div>
            <textarea
              value={error ? "" : output}
              readOnly
              spellCheck={false}
              placeholder={t("dev.outputPlaceholder")}
              className={cn(
                "border-border bg-surface-2 h-72 w-full resize-y rounded-xl border p-3 font-mono text-sm outline-none",
                error && "border-danger/50",
              )}
            />
            {error && (
              <p className="text-danger flex items-start gap-1.5 text-sm">
                <Icon name="X" size={15} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
