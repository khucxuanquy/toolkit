import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "random-picker",
  name: "Random Picker",
  description: "Draw a random number in a range, or pick from a list.",
  category: "Generators",
  icon: "Target",
  route: "/p/random-picker",
  tags: ["random", "number", "picker", "bốc số", "chọn ngẫu nhiên", "raffle"],
  accent: "from-teal-500 to-cyan-600",
};
