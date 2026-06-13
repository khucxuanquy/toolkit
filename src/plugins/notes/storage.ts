import { createNamespace } from "@/core/storage/storage";

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

const store = createNamespace("notes");
const KEY = "notes";

export const notesStorage = {
  load: () => store.load<Note[]>(KEY, []),
  save: (notes: Note[]) => store.save(KEY, notes),
};
