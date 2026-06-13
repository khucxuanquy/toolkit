"use client";

import { useEffect, useReducer } from "react";
import { Card, CardBody, Button, Input, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { notesStorage, type Note } from "./storage";

interface State {
  notes: Note[];
  selectedId: string | null;
  hydrated: boolean;
}
type Action =
  | { type: "HYDRATE"; notes: Note[] }
  | { type: "ADD" }
  | { type: "UPDATE"; id: string; patch: Partial<Pick<Note, "title" | "body">> }
  | { type: "REMOVE"; id: string }
  | { type: "SELECT"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "HYDRATE":
      return {
        ...state,
        notes: action.notes,
        selectedId: action.notes[0]?.id ?? null,
        hydrated: true,
      };
    case "ADD": {
      const note: Note = { id: crypto.randomUUID(), title: "", body: "", updatedAt: Date.now() };
      return { ...state, notes: [note, ...state.notes], selectedId: note.id };
    }
    case "UPDATE":
      return {
        ...state,
        notes: state.notes.map((n) =>
          n.id === action.id ? { ...n, ...action.patch, updatedAt: Date.now() } : n,
        ),
      };
    case "REMOVE": {
      const notes = state.notes.filter((n) => n.id !== action.id);
      return {
        ...state,
        notes,
        selectedId: state.selectedId === action.id ? (notes[0]?.id ?? null) : state.selectedId,
      };
    }
    case "SELECT":
      return { ...state, selectedId: action.id };
    default:
      return state;
  }
}

export default function NotesPage() {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reducer, { notes: [], selectedId: null, hydrated: false });

  useEffect(() => {
    let active = true;
    void notesStorage.load().then((notes) => active && dispatch({ type: "HYDRATE", notes }));
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (state.hydrated) void notesStorage.save(state.notes);
  }, [state.notes, state.hydrated]);

  const sorted = [...state.notes].sort((a, b) => b.updatedAt - a.updatedAt);
  const selected = state.notes.find((n) => n.id === state.selectedId) ?? null;

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      {/* List */}
      <Card className="h-fit">
        <CardBody className="space-y-3">
          <Button onClick={() => dispatch({ type: "ADD" })} className="w-full" size="sm">
            <Icon name="Plus" size={16} /> {t("notes.new")}
          </Button>
          {sorted.length === 0 ? (
            <p className="text-muted py-4 text-center text-sm">{t("notes.noNotes")}</p>
          ) : (
            <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
              {sorted.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => dispatch({ type: "SELECT", id: n.id })}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                      n.id === state.selectedId
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-surface-2",
                    )}
                  >
                    <div className="truncate font-medium">
                      {n.title.trim() || t("notes.untitled")}
                    </div>
                    <div className="text-muted truncate text-xs">{n.body.trim() || "—"}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Editor */}
      <Card>
        <CardBody>
          {selected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Input
                  value={selected.title}
                  onChange={(e) =>
                    dispatch({ type: "UPDATE", id: selected.id, patch: { title: e.target.value } })
                  }
                  placeholder={t("notes.title")}
                  className="border-0 bg-transparent px-0 text-lg font-semibold focus-visible:ring-0"
                />
                <button
                  onClick={() => dispatch({ type: "REMOVE", id: selected.id })}
                  aria-label={t("notes.delete")}
                  className="text-muted hover:text-danger shrink-0"
                >
                  <Icon name="Trash2" size={18} />
                </button>
              </div>
              <textarea
                value={selected.body}
                onChange={(e) =>
                  dispatch({ type: "UPDATE", id: selected.id, patch: { body: e.target.value } })
                }
                placeholder={t("notes.body")}
                rows={14}
                className="w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
              />
            </div>
          ) : (
            <p className="text-muted py-16 text-center text-sm">{t("notes.empty")}</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
