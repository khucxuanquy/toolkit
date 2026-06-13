import { manifest as ticTacToe } from "@/plugins/tic-tac-toe/manifest";
import { manifest as wheelSpinner } from "@/plugins/wheel-spinner/manifest";

/**
 * Plugin ids known at build time. Used by `generateStaticParams` so the static
 * export pre-renders every plugin page (`/p/<id>/`).
 *
 * Importing the manifests (plain data, no "use client") keeps this server-safe.
 * When adding a new plugin, include its manifest id here.
 */
export const PLUGIN_IDS: string[] = [ticTacToe.id, wheelSpinner.id];
