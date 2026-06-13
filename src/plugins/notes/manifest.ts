import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "notes",
  name: "Notes",
  description: "Quick notes, saved locally on your device.",
  category: "Productivity",
  icon: "StickyNote",
  route: "/p/notes",
  tags: ["notes", "memo", "ghi chú", "sổ tay"],
  accent: "from-yellow-400 to-amber-500",
};
