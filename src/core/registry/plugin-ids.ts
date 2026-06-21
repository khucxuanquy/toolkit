import { manifest as ticTacToe } from "@/plugins/tic-tac-toe/manifest";
import { manifest as wheelSpinner } from "@/plugins/wheel-spinner/manifest";
import { manifest as calculator } from "@/plugins/calculator/manifest";
import { manifest as timer } from "@/plugins/timer/manifest";
import { manifest as billSplit } from "@/plugins/bill-split/manifest";
import { manifest as qrGenerator } from "@/plugins/qr-generator/manifest";
import { manifest as passwordGenerator } from "@/plugins/password-generator/manifest";
import { manifest as memory } from "@/plugins/memory/manifest";
import { manifest as game2048 } from "@/plugins/2048/manifest";
import { manifest as coinDice } from "@/plugins/coin-dice/manifest";
import { manifest as colorPalette } from "@/plugins/color-palette/manifest";
import { manifest as todo } from "@/plugins/todo/manifest";
import { manifest as notes } from "@/plugins/notes/manifest";
import { manifest as unitConverter } from "@/plugins/unit-converter/manifest";
import { manifest as flappyBird } from "@/plugins/flappy-bird/manifest";
import { manifest as tower } from "@/plugins/tower/manifest";
import { manifest as routeTracker } from "@/plugins/route-tracker/manifest";
import { manifest as speech } from "@/plugins/speech/manifest";
import { manifest as musicRoom } from "@/plugins/music-room/manifest";
import { manifest as sudoku } from "@/plugins/sudoku/manifest";
import { manifest as drawGuess } from "@/plugins/draw-guess/manifest";
import { manifest as quiz } from "@/plugins/quiz/manifest";
import { manifest as weather } from "@/plugins/weather/manifest";
import { manifest as archery } from "@/plugins/archery/manifest";
import { manifest as bubbleShooter } from "@/plugins/bubble-shooter/manifest";
import { manifest as billiards } from "@/plugins/billiards/manifest";

/**
 * Plugin ids known at build time. Used by `generateStaticParams` so the static
 * export pre-renders every plugin page (`/p/<id>/`).
 *
 * Importing the manifests (plain data, no "use client") keeps this server-safe.
 * When adding a new plugin, include its manifest id here.
 */
const MANIFESTS = [
  ticTacToe,
  wheelSpinner,
  calculator,
  timer,
  billSplit,
  qrGenerator,
  passwordGenerator,
  memory,
  game2048,
  coinDice,
  colorPalette,
  todo,
  notes,
  unitConverter,
  flappyBird,
  tower,
  routeTracker,
  speech,
  musicRoom,
  sudoku,
  drawGuess,
  quiz,
  weather,
  archery,
  bubbleShooter,
  billiards,
];

export const PLUGIN_IDS: string[] = MANIFESTS.map((m) => m.id);

/** id → display name, for build-time `generateMetadata` (per-tool tab titles). */
export const PLUGIN_NAMES: Record<string, string> = Object.fromEntries(
  MANIFESTS.map((m) => [m.id, m.name]),
);
