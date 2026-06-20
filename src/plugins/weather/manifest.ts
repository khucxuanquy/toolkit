import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "weather",
  name: "Thời tiết",
  description: "Xem thời tiết hiện tại & dự báo 7 ngày tại vị trí của bạn.",
  category: "Utilities",
  icon: "CloudSun",
  route: "/p/weather",
  tags: ["thời tiết", "weather", "nhiệt độ", "mưa", "gió", "forecast", "dự báo"],
  accent: "from-sky-400 to-blue-600",
};
