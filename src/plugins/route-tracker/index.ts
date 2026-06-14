import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { registerBadge } from "@/core/registry/badges";
import { manifest } from "./manifest";
import { routeStorage } from "./storage";

export const routeTrackerPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(routeTrackerPlugin);
// Badge: number of saved routes.
registerBadge(manifest.id, async () => (await routeStorage.loadSessions()).length);
