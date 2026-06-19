import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "music-room",
  name: "Music Room",
  description: "Create or join a room to listen to YouTube music together in sync.",
  category: "Entertainment",
  icon: "Music",
  route: "/p/music-room",
  tags: [
    "music",
    "youtube",
    "room",
    "sync",
    "nhạc",
    "phòng nhạc",
    "nghe cùng",
    "realtime",
    "collaborative",
  ],
  accent: "from-violet-500 to-fuchsia-600",
};
