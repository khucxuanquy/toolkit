import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "sudoku",
  name: "Sudoku",
  description: "Classic number puzzle with three difficulties — plays offline.",
  category: "Games",
  icon: "Grid3x3",
  route: "/p/sudoku",
  tags: ["sudoku", "puzzle", "number", "logic", "trò chơi", "giải đố", "số"],
  accent: "from-sky-500 to-indigo-600",
};
