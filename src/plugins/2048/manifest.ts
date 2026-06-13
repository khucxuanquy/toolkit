import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "2048",
  name: "2048",
  description: "Slide tiles, merge matching numbers, and reach 2048.",
  category: "Games",
  icon: "Grid2x2",
  route: "/p/2048",
  tags: ["puzzle", "numbers", "slide", "merge", "trò chơi số"],
  accent: "from-orange-400 to-amber-600",
};
