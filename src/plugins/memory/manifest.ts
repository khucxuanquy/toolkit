import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "memory",
  name: "Memory Match",
  description: "Flip cards to find matching pairs — beat your best score.",
  category: "Games",
  icon: "Brain",
  route: "/p/memory",
  tags: ["memory", "cards", "pairs", "kids", "lật thẻ", "trí nhớ"],
  accent: "from-pink-500 to-rose-600",
};
