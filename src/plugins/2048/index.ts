import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const game2048Plugin = definePlugin(manifest, () => import("./page"));

registerPlugin(game2048Plugin);
