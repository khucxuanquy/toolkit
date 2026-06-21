/**
 * Shared types for the billiards engine. Framework-agnostic; the engine renders
 * entirely to a single HTML5 canvas.
 */

/** The lifecycle contract every embeddable game exposes (platform spec). */
export interface GamePlugin {
  id: string;
  name: string;
  version: string;
  init(container: HTMLElement): void;
  start(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  destroy(): void;
}

export interface Vec2 {
  x: number;
  y: number;
}

export type GameVariant = "8ball" | "9ball";
export type PlayMode = "1p" | "2p";
export type Group = "solids" | "stripes" | null;
export type Phase = "menu" | "aiming" | "shooting" | "ballinhand" | "gameover";

export type SoundName = "cue" | "ball" | "cushion" | "pocket" | "win" | "lose";

/** A physics event surfaced for sound / scoring during a step. */
export interface PhysEvent {
  type: "ball" | "cushion" | "pocket";
  strength: number; // 0..1 normalized impact for audio
  a?: number; // ball number involved
  b?: number; // second ball number (ball-ball)
  pos: Vec2;
}

/** Everything that happened during one shot, for the rules engine. */
export interface ShotResult {
  firstContact: number | null; // ball number the cue first struck
  pocketed: number[]; // ball numbers pocketed (excludes the cue ball)
  cueScratched: boolean; // cue ball was pocketed
  railAfterContact: boolean; // a ball hit a rail (or was pocketed) after first contact
  isBreak: boolean;
}

/** A clickable on-canvas button (screen-space px). */
export interface UIButton {
  key: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  active?: boolean;
}

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const TAU = Math.PI * 2;

/** Replace {placeholders} in a template string. */
export function fmt(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
}

/** Localizable UI + rules strings for the billiards game (canvas text). */
export interface BilliardsStrings {
  // Menu
  title: string;
  chooseGame: string;
  players: string;
  eightBall: string;
  nineBall: string;
  onePlayer: string;
  twoPlayers: string;
  startGame: string;
  // HUD
  menu: string;
  you: string;
  cpu: string;
  player: string; // "Player {n}"
  turn: string; // "{who}'s turn"
  thinking: string; // " (thinking…)"
  youGroup: string; // "You: {g}"
  twoGroups: string; // "P1: {g1}  •  P2: {g2}"
  ballOn: string; // "Ball on: {n}"
  ballInHand: string;
  spin: string;
  solids: string;
  stripes: string;
  unknownGroup: string;
  // Game over
  youWin: string;
  cpuWins: string;
  playerWins: string; // "🎉 Player {n} wins!"
  playAgain: string;
  // Break prompts
  break8: string;
  break9: string;
  // Rule messages
  foul: string; // "Foul: {reasons} — ball in hand"
  reasonSep: string; // ", "
  reasonScratch: string;
  reasonNoContact: string;
  reasonMustHit8: string;
  reasonWrongGroup: string;
  reasonCantHit8Open: string;
  reasonNoRail: string;
  reasonMustHitLowest: string; // "Must hit the {n} first"
  eightBreakRespot: string;
  eightBreakRespotFoul: string;
  win8: string; // "Player {n} sinks the 8 — wins!"
  lose8: string; // "Player {n} pocketed the 8 illegally — loses!"
  takesGroup: string; // "Player {n} takes {g}"
  potContinue: string; // "Player {n} pots and continues"
  nothingDropped: string;
  win9: string; // "Player {n} sinks the 9 — wins!"
  foul9: string; // "Foul: {reasons} — 9 re-spotted, ball in hand"
}

export const DEFAULT_BILLIARDS_STRINGS: BilliardsStrings = {
  title: "🎱 Billiards",
  chooseGame: "Choose a game",
  players: "Players",
  eightBall: "8-Ball",
  nineBall: "9-Ball",
  onePlayer: "1 Player (vs CPU)",
  twoPlayers: "2 Players",
  startGame: "▶  Start Game",
  menu: "Menu",
  you: "You",
  cpu: "CPU",
  player: "Player {n}",
  turn: "{who}'s turn",
  thinking: " (thinking…)",
  youGroup: "You: {g}",
  twoGroups: "P1: {g1}  •  P2: {g2}",
  ballOn: "Ball on: {n}",
  ballInHand: "Ball in hand — drag the cue ball to place it",
  spin: "spin",
  solids: "solids",
  stripes: "stripes",
  unknownGroup: "?",
  youWin: "🎉 You win!",
  cpuWins: "CPU wins",
  playerWins: "🎉 Player {n} wins!",
  playAgain: "Play again",
  break8: "Player 1 — break!",
  break9: "Player 1 — break (hit the 1)",
  foul: "Foul: {reasons} — ball in hand",
  reasonSep: ", ",
  reasonScratch: "Scratch",
  reasonNoContact: "No ball contacted",
  reasonMustHit8: "Must hit the 8 first",
  reasonWrongGroup: "Hit the wrong group first",
  reasonCantHit8Open: "Can't hit the 8 first on an open table",
  reasonNoRail: "No rail after contact",
  reasonMustHitLowest: "Must hit the {n} first",
  eightBreakRespot: "8 on the break — re-spotted",
  eightBreakRespotFoul: "8 on the break re-spotted (foul)",
  win8: "Player {n} sinks the 8 — wins!",
  lose8: "Player {n} pocketed the 8 illegally — loses!",
  takesGroup: "Player {n} takes {g}",
  potContinue: "Player {n} pots and continues",
  nothingDropped: "Nothing dropped — turn passes",
  win9: "Player {n} sinks the 9 — wins!",
  foul9: "Foul: {reasons} — 9 re-spotted, ball in hand",
};
