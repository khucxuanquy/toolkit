export interface QuizQuestion {
  q: string;
  options: string[]; // 2..4 options
  correct: number; // index into options
}

export interface QuizRoomMeta {
  code: string;
  name: string;
  createdAt: number;
}

export interface QuizPlayer {
  name: string;
  avatarUrl?: string | null;
  joinedAt: number;
  score: number;
}

export type QuizPhase = "lobby" | "question" | "reveal" | "ended";

export interface QuizState {
  phase: QuizPhase;
  qIndex: number;
  questionEndsAt: number;
  total: number;
  hostId: string | null;
}

export interface QuizAnswer {
  choice: number;
  at: number; // epoch ms
}
