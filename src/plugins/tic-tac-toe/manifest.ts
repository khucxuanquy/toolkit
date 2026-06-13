import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "tic-tac-toe",
  name: "Tic Tac Toe Infinity",
  description: "3×3 noughts & crosses where marks vanish after a few seconds.",
  category: "Games",
  icon: "Grid3x3",
  route: "/p/tic-tac-toe",
  tags: ["game", "noughts and crosses", "xo", "infinity", "2 player", "caro"],
  accent: "from-indigo-500 to-violet-500",
};
