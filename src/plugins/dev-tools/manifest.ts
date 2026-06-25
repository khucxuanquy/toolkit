import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "dev-tools",
  name: "Dev Tools",
  description: "CSV↔JSON, Base64, URL encode/decode, JWT decode, Timestamp, Hash, JSON→TypeScript — paste text or upload a file.",
  category: "Utilities",
  icon: "Braces",
  route: "/p/dev-tools",
  tags: [
    "developer", "lập trình",
    "json", "csv", "convert", "chuyển đổi", "format", "beautify", "minify",
    "typescript", "types", "interface",
    "base64", "encode", "decode", "mã hóa",
    "url", "urlencode",
    "jwt", "token",
    "timestamp", "date", "time", "unix",
    "hash", "sha", "sha256", "checksum",
  ],
  accent: "from-slate-600 to-slate-800",
};
