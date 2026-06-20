/**
 * Single place where every plugin is wired into the platform.
 *
 * Importing a plugin's `index` module runs its `registerPlugin(...)` side
 * effect. The plugin's heavy UI is wrapped in `next/dynamic`, so this import
 * only pulls in lightweight metadata — the implementation is fetched lazily
 * when the user opens the plugin.
 *
 * To add a new tool/game: scaffold it with `npm run create-plugin`, then add a
 * single import line below.
 */
import "@/plugins/tic-tac-toe";
import "@/plugins/wheel-spinner";
import "@/plugins/calculator";
import "@/plugins/timer";
import "@/plugins/bill-split";
import "@/plugins/qr-generator";
import "@/plugins/password-generator";
import "@/plugins/memory";
import "@/plugins/2048";
import "@/plugins/coin-dice";
import "@/plugins/color-palette";
import "@/plugins/todo";
import "@/plugins/notes";
import "@/plugins/unit-converter";
import "@/plugins/flappy-bird";
import "@/plugins/tower";
import "@/plugins/route-tracker";
import "@/plugins/speech";
import "@/plugins/music-room";
import "@/plugins/sudoku";
import "@/plugins/draw-guess";

/** Imported for its side effects only. */
export const PLUGINS_REGISTERED = true;
