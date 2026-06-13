import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "todo",
  name: "To-do List",
  description: "A simple checklist that saves on your device.",
  category: "Productivity",
  icon: "ListTodo",
  route: "/p/todo",
  tags: ["todo", "checklist", "tasks", "việc cần làm", "danh sách"],
  accent: "from-sky-500 to-indigo-600",
};
