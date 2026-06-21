import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";
import { ArcheryGame } from "./ArcheryGame";

// ── Platform registration (Quy's Toolkit plugin system) ──────────────────────
export const archeryPlugin = definePlugin(manifest, () => import("./page"));
registerPlugin(archeryPlugin);

// ── Framework-agnostic game engine exports ───────────────────────────────────
export { ArcheryGame } from "./ArcheryGame";
export type { GamePlugin, GameMode } from "./types";

/** Spec-compliant default: a ready-to-mount GamePlugin instance. */
const ArcheryGamePlugin = new ArcheryGame();
export default ArcheryGamePlugin;
