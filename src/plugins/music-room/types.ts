export interface MusicRoom {
  code: string;
  name: string;
  visibility: "public" | "private";
  createdAt: number;
}

export interface RoomPresence {
  name: string;
  avatarUrl?: string | null;
  joinedAt: number;
}

export interface MusicQueueItem {
  id: string;
  sourceId: string; // YouTube video ID
  title: string;
  thumbnail: string;
  channel: string;
  duration: string | null;
  addedBy: string; // userId
  addedByName: string;
  position: number;
  addedAt: number;
}

export interface MusicPlayerState {
  currentItemId: string | null;
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

export interface MusicChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
  isSystem?: boolean;
}
