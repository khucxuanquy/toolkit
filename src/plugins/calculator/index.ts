import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const calculatorPlugin = definePlugin(manifest, () => import("./page"));

registerPlugin(calculatorPlugin);
