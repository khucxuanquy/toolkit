import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const timerPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(timerPlugin);
