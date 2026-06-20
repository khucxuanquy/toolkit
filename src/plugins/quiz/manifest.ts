import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "quiz",
  name: "Quiz Party",
  description: "Host a live quiz — everyone answers on their phone, race for points. Needs internet.",
  category: "Entertainment",
  icon: "Brain",
  route: "/p/quiz",
  tags: ["quiz", "trivia", "kahoot", "party", "đố vui", "trắc nghiệm", "nhiều người", "realtime"],
  accent: "from-purple-500 to-indigo-600",
};
