"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { Card, CardBody, Button, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import {
  csvToJson, jsonToCsv, formatJson, jsonToTs,
  base64Encode, base64Decode,
  urlEncode, urlDecode,
  jwtDecode, convertTimestamp, hashText,
  SAMPLES,
  type DevMode, type Direction, type HashAlgorithm,
} from "./logic";

export default function DevToolsPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<DevMode>("csv2json");
  const [input, setInput] = useState("");
  const [minify, setMinify] = useState(false);
  const [direction, setDirection] = useState<Direction>("encode");
  const [hashAlgo, setHashAlgo] = useState<HashAlgorithm>("SHA-256");
  const [hashResult, setHashResult] = useState("");
  const [hashError, setHashError] = useState<string | null>(null);

  const toolGroups = [
    {
      label: t("dev.groupData"),
      tools: [
        { id: "csv2json" as DevMode, label: t("dev.csv2json") },
        { id: "json2csv" as DevMode, label: t("dev.json2csv") },
        { id: "format" as DevMode, label: t("dev.format") },
        { id: "json2ts" as DevMode, label: t("dev.json2ts") },
      ],
    },
    {
      label: t("dev.groupEncode"),
      tools: [
        { id: "base64" as DevMode, label: t("dev.base64") },
        { id: "urlencode" as DevMode, label: t("dev.urlencode") },
      ],
    },
    {
      label: t("dev.groupUtils"),
      tools: [
        { id: "jwt" as DevMode, label: t("dev.jwt") },
        { id: "timestamp" as DevMode, label: t("dev.timestamp") },
        { id: "hash" as DevMode, label: t("dev.hash") },
      ],
    },
  ];

  // Async hash — fires whenever mode/input/algorithm changes.
  useEffect(() => {
    if (mode !== "hash") return;
    if (!input.trim()) { setHashResult(""); setHashError(null); return; }
    hashText(input, hashAlgo)
      .then((h) => { setHashResult(h); setHashError(null); })
      .catch((e) => { setHashResult(""); setHashError((e as Error).message); });
  }, [mode, input, hashAlgo]);

  // Sync conversion for all other modes.
  const { syncOutput, syncError } = useMemo(() => {
    if (mode === "hash" || !input.trim()) return { syncOutput: "", syncError: null as string | null };
    try {
      let out = "";
      if (mode === "csv2json") out = csvToJson(input);
      else if (mode === "json2csv") out = jsonToCsv(input);
      else if (mode === "format") out = formatJson(input, minify);
      else if (mode === "json2ts") out = jsonToTs(input);
      else if (mode === "base64") out = direction === "encode" ? base64Encode(input) : base64Decode(input);
      else if (mode === "urlencode") out = direction === "encode" ? urlEncode(input) : urlDecode(input);
      else if (mode === "jwt") out = jwtDecode(input);
      else if (mode === "timestamp") out = convertTimestamp(input);
      return { syncOutput: out, syncError: null as string | null };
    } catch (e) {
      return { syncOutput: "", syncError: (e as Error).message };
    }
  }, [input, mode, minify, direction]);

  const output = mode === "hash" ? hashResult : syncOutput;
  const error = mode === "hash" ? hashError : syncError;

  // Output file name / MIME for download.
  const isJsonOut = mode === "csv2json" || mode === "format" || mode === "jwt";
  const isCsvOut = mode === "json2csv";
  const isTsOut = mode === "json2ts";
  const outName = isJsonOut ? "data.json" : isCsvOut ? "data.csv" : isTsOut ? "types.ts" : "data.txt";
  const outMime = isJsonOut ? "application/json" : isCsvOut ? "text/csv" : "text/plain";

  function getPlaceholder(): string {
    if (mode === "csv2json") return t("dev.phCsv");
    if (mode === "json2csv" || mode === "format" || mode === "json2ts" || mode === "jwt") return t("dev.phJson");
    if (mode === "base64") return direction === "encode" ? t("dev.phText") : t("dev.phBase64");
    if (mode === "urlencode") return direction === "encode" ? t("dev.phText") : t("dev.phUrl");
    if (mode === "timestamp") return t("dev.phTimestamp");
    return t("dev.phText"); // hash
  }

  const pickFile = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      setInput(text);
      const ext = file.name.toLowerCase().split(".").pop();
      if (ext === "csv" || ext === "tsv") setMode("csv2json");
      else if (ext === "json" && mode === "csv2json") setMode("format");
      toast(t("dev.loaded", { name: file.name }), "success");
    } catch {
      toast(t("dev.readError"), "error");
    }
  };

  const copy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(output); toast(t("dev.copied"), "success"); }
    catch { toast(t("dev.copyError"), "error"); }
  };

  const download = () => {
    if (!output) return;
    const url = URL.createObjectURL(new Blob([output], { type: `${outMime};charset=utf-8` }));
    const a = document.createElement("a");
    a.href = url; a.download = outName; a.click();
    URL.revokeObjectURL(url);
  };

  const hasOptions = mode === "format" || mode === "base64" || mode === "urlencode" || mode === "hash";

  return (
    <div className="space-y-4">
      {/* Tool picker */}
      <Card>
        <CardBody className="space-y-3 py-3">
          <div className="flex flex-wrap items-center gap-1">
            {toolGroups.map((group, gi) => (
              <Fragment key={gi}>
                {gi > 0 && <div className="bg-border mx-1 h-5 w-px shrink-0" />}
                {group.tools.map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setMode(tool.id)}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
                      mode === tool.id
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted hover:bg-surface-2 hover:text-foreground",
                    )}
                  >
                    {tool.label}
                  </button>
                ))}
              </Fragment>
            ))}
          </div>

          {/* Mode-specific options */}
          {hasOptions && (
            <div className="border-border bg-surface-2 inline-flex gap-1 rounded-xl border p-1">
              {mode === "format" &&
                ([false, true] as const).map((v) => (
                  <button
                    key={String(v)}
                    onClick={() => setMinify(v)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
                      minify === v ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                    )}
                  >
                    {v ? t("dev.minify") : t("dev.beautify")}
                  </button>
                ))}

              {(mode === "base64" || mode === "urlencode") &&
                (["encode", "decode"] as Direction[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={cn(
                      "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
                      direction === d ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                    )}
                  >
                    {d === "encode" ? t("dev.encode") : t("dev.decode")}
                  </button>
                ))}

              {mode === "hash" &&
                (["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as HashAlgorithm[]).map((alg) => (
                  <button
                    key={alg}
                    onClick={() => setHashAlgo(alg)}
                    className={cn(
                      "rounded-lg px-3 py-1 font-mono text-xs font-medium transition-colors",
                      hashAlgo === alg ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                    )}
                  >
                    {alg}
                  </button>
                ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Input / Output */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("dev.input")}</h2>
              <div className="flex gap-1">
                {mode === "timestamp" && (
                  <Button size="sm" variant="ghost" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
                    <Icon name="Timer" size={14} /> {t("dev.now")}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setInput(SAMPLES[mode])}>
                  <Icon name="Sparkles" size={14} /> {t("dev.sample")}
                </Button>
                <Button size="sm" variant="ghost" onClick={pickFile}>
                  <Icon name="Upload" size={14} /> {t("dev.upload")}
                </Button>
                <Button
                  size="sm" variant="ghost"
                  onClick={() => setInput("")}
                  disabled={!input}
                  aria-label={t("dev.clear")}
                >
                  <Icon name="Trash2" size={14} />
                </Button>
              </div>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder={getPlaceholder()}
              className="border-border bg-surface-2 focus:ring-ring h-64 w-full resize-y rounded-xl border p-3 font-mono text-sm outline-none focus:ring-2"
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

        <Card>
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("dev.output")}</h2>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={copy} disabled={!output}>
                  <Icon name="Copy" size={14} /> {t("dev.copy")}
                </Button>
                <Button size="sm" variant="ghost" onClick={download} disabled={!output}>
                  <Icon name="Download" size={14} /> {t("dev.download")}
                </Button>
              </div>
            </div>
            <textarea
              value={error ? "" : output}
              readOnly
              spellCheck={false}
              placeholder={t("dev.outputPlaceholder")}
              className={cn(
                "border-border bg-surface-2 h-64 w-full resize-y rounded-xl border p-3 font-mono text-sm outline-none",
                error && "border-danger/50",
              )}
            />
            {error && (
              <p className="text-danger flex items-start gap-1.5 text-sm">
                <Icon name="X" size={14} className="mt-0.5 shrink-0" />
                <span className="break-words">{error}</span>
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
