import { createNamespace } from "@/core/storage/storage";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

const store = createNamespace("todo");
const KEY = "items";

export const todoStorage = {
  load: () => store.load<Todo[]>(KEY, []),
  save: (items: Todo[]) => store.save(KEY, items),
};
