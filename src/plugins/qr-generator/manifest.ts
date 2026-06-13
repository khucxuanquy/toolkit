import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "qr-generator",
  name: "QR Generator",
  description: "Turn any text, link or WiFi into a QR code and download it.",
  category: "Generators",
  icon: "QrCode",
  route: "/p/qr-generator",
  tags: ["qr", "code", "link", "wifi", "mã qr"],
  accent: "from-cyan-500 to-blue-600",
};
