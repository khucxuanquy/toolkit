import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "dev-tools",
  name: "Dev Tools",
  description: "Convert CSV ↔ JSON and beautify/minify JSON — paste text or upload a file.",
  category: "Utilities",
  icon: "Braces",
  route: "/p/dev-tools",
  tags: [
    "developer",
    "json",
    "csv",
    "convert",
    "beautify",
    "minify",
    "format",
    "lập trình",
    "chuyển đổi",
  ],
  accent: "from-slate-600 to-slate-800",
};
