import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { registerBadge } from "@/core/registry/badges";
import { manifest } from "./manifest";
import { todoStorage } from "./storage";

export const todoPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(todoPlugin);
// Badge: number of unfinished tasks.
registerBadge(manifest.id, async () => (await todoStorage.load()).filter((t) => !t.done).length);
