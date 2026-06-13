import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const flappyBirdPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(flappyBirdPlugin);
