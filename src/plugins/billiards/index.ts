import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";
import { BilliardsGame } from "./BilliardsGame";

export const billiardsPlugin = definePlugin(manifest, () => import("./page"));
registerPlugin(billiardsPlugin);

export { BilliardsGame } from "./BilliardsGame";
export type { GamePlugin, GameVariant, PlayMode } from "./types";

/** Spec-compliant default: a ready-to-mount GamePlugin instance. */
const BilliardsPlugin = new BilliardsGame();
export default BilliardsPlugin;
