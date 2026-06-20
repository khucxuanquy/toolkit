export interface DrawRoomMeta {
  code: string;
  name: string;
  createdAt: number;
}

export interface DrawPlayer {
  name: string;
  avatarUrl?: string | null;
  joinedAt: number;
  score: number;
}

export type RoomPhase = "lobby" | "choosing" | "drawing" | "reveal" | "ended";

export interface DrawState {
  phase: RoomPhase;
  drawerId: string | null;
  round: number; // 1-based turn counter
  totalTurns: number;
  word: string | null; // plaintext; guesser UI masks it (no anti-cheat — friendly play)
  wordLen: number;
  spaces: number[]; // indices that are spaces in the word
  turnEndsAt: number; // epoch ms
  guessedIds: Record<string, number>; // uid → points earned this turn
  hostId: string | null;
}

export interface DrawStroke {
  color: string;
  width: number;
  points: number[]; // flattened [x0,y0,x1,y1,...] normalised 0..1
  by: string;
}

export interface DrawChat {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  kind?: "guess" | "correct" | "system";
}
