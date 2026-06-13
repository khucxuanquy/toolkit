import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "timer",
  name: "Timer & Stopwatch",
  description: "Countdown timer with alarm and a lap stopwatch.",
  category: "Utilities",
  icon: "Timer",
  route: "/p/timer",
  tags: ["stopwatch", "countdown", "alarm", "hẹn giờ", "bấm giờ", "đồng hồ"],
  accent: "from-emerald-500 to-teal-600",
};
