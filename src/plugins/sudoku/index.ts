import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const sudokuPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(sudokuPlugin);
