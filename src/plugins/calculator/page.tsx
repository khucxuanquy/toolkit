"use client";

import { useCallback, useEffect, useReducer } from "react";
import { Card, CardBody, Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { evaluate, formatResult } from "./logic";
import { calculatorStorage, type HistoryItem } from "./storage";

const DISPLAY: Record<string, string> = { "*": "×", "/": "÷", "-": "−" };
const toDisplay = (s: string) => s.replace(/[*/-]/g, (m) => DISPLAY[m]);

interface State {
  expr: string;
  history: HistoryItem[];
  hydrated: boolean;
}
type Action =
  | { type: "HYDRATE"; history: HistoryItem[] }
  | { type: "INPUT"; value: string }
  | { type: "BACKSPACE" }
  | { type: "CLEAR" }
  | { type: "EQUALS" }
  | { type: "CLEAR_HISTORY" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, history: action.history, hydrated: true };
    case "INPUT":
      return { ...state, expr: state.expr + action.value };
    case "BACKSPACE":
      return { ...state, expr: state.expr.slice(0, -1) };
    case "CLEAR":
      return { ...state, expr: "" };
    case "EQUALS": {
      if (!state.expr) return state;
      try {
        const result = formatResult(evaluate(state.expr));
        const item: HistoryItem = { expr: state.expr, result };
        return { ...state, expr: result, history: [item, ...state.history].slice(0, 15) };
      } catch {
        return state;
      }
    }
    case "CLEAR_HISTORY":
      return { ...state, history: [] };
    default:
      return state;
  }
}

const KEYS: { label: string; value?: string; action?: Action["type"]; variant?: string }[] = [
  { label: "AC", action: "CLEAR", variant: "fn" },
  { label: "⌫", action: "BACKSPACE", variant: "fn" },
  { label: "(", value: "(", variant: "fn" },
  { label: ")", value: ")", variant: "fn" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "÷", value: "/", variant: "op" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "×", value: "*", variant: "op" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "−", value: "-", variant: "op" },
  { label: "0", value: "0" },
  { label: ".", value: "." },
  { label: "=", action: "EQUALS", variant: "eq" },
  { label: "+", value: "+", variant: "op" },
];

export default function CalculatorPage() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, { expr: "", history: [], hydrated: false });

  useEffect(() => {
    let active = true;
    void calculatorStorage.load().then((h) => active && dispatch({ type: "HYDRATE", history: h }));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (state.hydrated) void calculatorStorage.save(state.history);
  }, [state.history, state.hydrated]);

  // Live preview of the current expression.
  let preview = "";
  if (state.expr) {
    try {
      preview = formatResult(evaluate(state.expr));
    } catch {
      preview = "";
    }
  }

  const onKey = useCallback((e: KeyboardEvent) => {
    if (/[0-9+\-*/().]/.test(e.key)) dispatch({ type: "INPUT", value: e.key });
    else if (e.key === "Enter" || e.key === "=") dispatch({ type: "EQUALS" });
    else if (e.key === "Backspace") dispatch({ type: "BACKSPACE" });
    else if (e.key === "Escape") dispatch({ type: "CLEAR" });
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <div className="mx-auto grid max-w-2xl gap-5 lg:grid-cols-[1fr_240px]">
      <Card>
        <CardBody className="space-y-4">
          {/* Display */}
          <div className="bg-surface-2 rounded-xl px-4 py-5 text-right">
            <div className="text-muted min-h-6 text-sm break-all">
              {toDisplay(state.expr) || "0"}
            </div>
            <div className="mt-1 text-3xl font-bold break-all">{preview || " "}</div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-4 gap-2">
            {KEYS.map((k) => (
              <button
                key={k.label}
                onClick={() =>
                  k.action
                    ? dispatch({ type: k.action } as Action)
                    : dispatch({ type: "INPUT", value: k.value as string })
                }
                className={cn(
                  "h-14 rounded-xl text-lg font-semibold transition-colors",
                  k.variant === "op" && "bg-primary/15 text-primary hover:bg-primary/25",
                  k.variant === "eq" && "bg-primary text-primary-foreground hover:bg-primary-hover",
                  k.variant === "fn" && "bg-surface-2 text-muted hover:bg-border",
                  !k.variant && "bg-surface-2 hover:bg-border",
                )}
              >
                {k.label}
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* History */}
      <Card className="h-fit">
        <CardBody className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-semibold">
              <Icon name="History" size={18} /> {t("calc.history")}
            </h3>
            {state.history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "CLEAR_HISTORY" })}>
                {t("calc.clear")}
              </Button>
            )}
          </div>
          {state.history.length === 0 ? (
            <p className="text-muted text-sm">{t("calc.noHistory")}</p>
          ) : (
            <ul className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
              {state.history.map((h, i) => (
                <li key={i} className="border-border bg-surface rounded-lg border px-3 py-1.5">
                  <div className="text-muted truncate text-xs">{toDisplay(h.expr)}</div>
                  <div className="truncate text-right font-semibold">{h.result}</div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
