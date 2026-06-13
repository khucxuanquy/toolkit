import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "route-tracker",
  name: "Route Tracker",
  description: "Record the path you walk on a live map (needs GPS + internet).",
  category: "Utilities",
  icon: "Route",
  route: "/p/route-tracker",
  tags: ["map", "gps", "route", "walk", "track", "bản đồ", "đường đi", "định vị"],
  accent: "from-emerald-500 to-teal-600",
};
