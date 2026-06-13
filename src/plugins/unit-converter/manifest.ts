import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "unit-converter",
  name: "Unit Converter",
  description: "Convert length, weight, temperature and currency.",
  category: "Utilities",
  icon: "Ruler",
  route: "/p/unit-converter",
  tags: ["convert", "units", "currency", "đổi đơn vị", "tiền tệ", "nhiệt độ"],
  accent: "from-lime-500 to-green-600",
};
