"use client";

import { useEffect, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardBody, Input, Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { todoStorage, type Todo } from "./storage";

interface State {
  items: Todo[];
  hydrated: boolean;
}
type Action =
  | { type: "HYDRATE"; items: Todo[] }
  | { type: "ADD"; text: string }
  | { type: "TOGGLE"; id: string }
  | { type: "REMOVE"; id: string }
  | { type: "CLEAR_DONE" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items, hydrated: true };
    case "ADD": {
      const text = action.text.trim();
      if (!text) return state;
      const item: Todo = { id: crypto.randomUUID(), text, done: false };
      return { ...state, items: [item, ...state.items] };
    }
    case "TOGGLE":
      return {
        ...state,
        items: state.items.map((i) => (i.id === action.id ? { ...i, done: !i.done } : i)),
      };
    case "REMOVE":
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case "CLEAR_DONE":
      return { ...state, items: state.items.filter((i) => !i.done) };
    default:
      return state;
  }
}

export default function TodoPage() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, { items: [], hydrated: false });
  const [text, setText] = useState("");

  useEffect(() => {
    let active = true;
    void todoStorage.load().then((items) => active && dispatch({ type: "HYDRATE", items }));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (state.hydrated) void todoStorage.save(state.items);
  }, [state.items, state.hydrated]);

  const remaining = state.items.filter((i) => !i.done).length;
  const hasDone = state.items.some((i) => i.done);

  const add = () => {
    dispatch({ type: "ADD", text });
    setText("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
            className="flex gap-2"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("todo.placeholder")}
              autoComplete="off"
            />
            <Button type="submit" size="icon" aria-label={t("todo.add")}>
              <Icon name="Plus" size={18} />
            </Button>
          </form>

          <div className="text-muted flex items-center justify-between text-sm">
            <span>{t("todo.remaining", { n: remaining })}</span>
            {hasDone && (
              <button
                onClick={() => dispatch({ type: "CLEAR_DONE" })}
                className="hover:text-foreground"
              >
                {t("todo.clearDone")}
              </button>
            )}
          </div>

          {state.items.length === 0 ? (
            <p className="text-muted py-6 text-center text-sm">{t("todo.empty")}</p>
          ) : (
            <ul className="space-y-1.5">
              <AnimatePresence initial={false}>
                {state.items.map((item) => (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="border-border bg-surface flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <button
                      onClick={() => dispatch({ type: "TOGGLE", id: item.id })}
                      aria-label={item.text}
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                        item.done ? "border-primary bg-primary text-white" : "border-border",
                      )}
                    >
                      {item.done && <Icon name="Check" size={14} />}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm break-words",
                        item.done && "text-muted line-through",
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => dispatch({ type: "REMOVE", id: item.id })}
                      aria-label="Delete"
                      className="text-muted hover:text-danger shrink-0"
                    >
                      <Icon name="Trash2" size={16} />
                    </button>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
