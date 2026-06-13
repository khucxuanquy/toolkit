import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "password-generator",
  name: "Password Generator",
  description: "Create strong random passwords — fully on your device.",
  category: "Generators",
  icon: "KeyRound",
  route: "/p/password-generator",
  tags: ["password", "secure", "random", "mật khẩu", "bảo mật"],
  accent: "from-violet-500 to-fuchsia-600",
};
