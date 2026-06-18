import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "leaderboard",
  name: "Leaderboard",
  description: "See who's online and the global high scores (needs internet).",
  category: "Games",
  icon: "Trophy",
  route: "/p/leaderboard",
  tags: ["leaderboard", "scores", "online", "ranking", "bảng xếp hạng", "trực tuyến"],
  accent: "from-amber-400 to-orange-600",
};
