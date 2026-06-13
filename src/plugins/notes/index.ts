import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { registerBadge } from "@/core/registry/badges";
import { manifest } from "./manifest";
import { notesStorage } from "./storage";

export const notesPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(notesPlugin);
// Badge: number of saved notes.
registerBadge(manifest.id, async () => (await notesStorage.load()).length);
