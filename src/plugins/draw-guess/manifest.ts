import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "draw-guess",
  name: "Draw & Guess",
  description: "Draw a secret word while friends race to guess it. Needs internet.",
  category: "Entertainment",
  icon: "Pencil",
  route: "/p/draw-guess",
  tags: ["draw", "guess", "party", "multiplayer", "vẽ", "đoán", "nhiều người", "realtime"],
  accent: "from-rose-500 to-orange-500",
};
