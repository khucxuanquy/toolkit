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
import { manifest as randomPicker } from "@/plugins/random-picker/manifest";
import { manifest as colorPalette } from "@/plugins/color-palette/manifest";
import { manifest as todo } from "@/plugins/todo/manifest";
import { manifest as notes } from "@/plugins/notes/manifest";
import { manifest as unitConverter } from "@/plugins/unit-converter/manifest";

/**
 * Plugin ids known at build time. Used by `generateStaticParams` so the static
 * export pre-renders every plugin page (`/p/<id>/`).
 *
 * Importing the manifests (plain data, no "use client") keeps this server-safe.
 * When adding a new plugin, include its manifest id here.
 */
export const PLUGIN_IDS: string[] = [
  ticTacToe.id,
  wheelSpinner.id,
  calculator.id,
  timer.id,
  billSplit.id,
  qrGenerator.id,
  passwordGenerator.id,
  memory.id,
  game2048.id,
  coinDice.id,
  randomPicker.id,
  colorPalette.id,
  todo.id,
  notes.id,
  unitConverter.id,
];
