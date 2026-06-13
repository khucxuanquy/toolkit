import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "coin-dice",
  name: "Coin & Dice",
  description: "Flip a coin or roll dice to make a quick decision.",
  category: "Generators",
  icon: "Dices",
  route: "/p/coin-dice",
  tags: ["coin", "dice", "random", "đồng xu", "xúc xắc", "tung"],
  accent: "from-red-500 to-rose-600",
};
