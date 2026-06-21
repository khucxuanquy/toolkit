import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";
import { BubbleShooterGame } from "./BubbleShooterGame";

export const bubbleShooterPlugin = definePlugin(manifest, () => import("./page"));
registerPlugin(bubbleShooterPlugin);

export { BubbleShooterGame } from "./BubbleShooterGame";
export type { GameMode, GameStatus } from "./types";

const BubbleShooterPlugin = new BubbleShooterGame();
export default BubbleShooterPlugin;
