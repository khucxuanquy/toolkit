import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "speech",
  name: "Text ↔ Speech",
  description: "Read text aloud and turn your voice into text (Vietnamese & English).",
  category: "Utilities",
  icon: "AudioLines",
  route: "/p/speech",
  tags: ["tts", "stt", "voice", "speech", "đọc văn bản", "giọng nói", "nhận diện", "dictate"],
  accent: "from-violet-500 to-fuchsia-600",
};
