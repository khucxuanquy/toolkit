import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "color-palette",
  name: "Color Palette",
  description: "Generate color palettes, lock favourites and copy hex codes.",
  category: "Generators",
  icon: "Palette",
  route: "/p/color-palette",
  tags: ["color", "palette", "hex", "design", "bảng màu", "màu sắc"],
  accent: "from-fuchsia-500 to-purple-600",
};
