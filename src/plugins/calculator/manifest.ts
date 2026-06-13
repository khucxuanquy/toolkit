import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "calculator",
  name: "Calculator",
  description: "A clean calculator with order of operations and history.",
  category: "Utilities",
  icon: "Calculator",
  route: "/p/calculator",
  tags: ["math", "calc", "máy tính", "tính toán"],
  accent: "from-slate-500 to-slate-700",
};
