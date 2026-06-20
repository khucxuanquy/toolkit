export interface MusicRoom {
  code: string;
  name: string;
  visibility: "public" | "private";
  createdAt: number;
  /** Last time someone was active in the room; rooms idle >24h are pruned. */
  lastActive?: number;
  /** Creator's user id + display name (the room owner). */
  createdBy?: string;
  createdByName?: string;
}

export interface RoomPresence {
  name: string;
  avatarUrl?: string | null;
  joinedAt: number;
}

export interface MusicQueueItem {
  id: string;
  source: "youtube" | "spotify" | "soundcloud" | "tiktok";
  sourceId: string; // YouTube video ID, or "type/id" / path for other providers
  url: string; // canonical original URL
  embedUrl: string; // iframe src for non-youtube providers ("" for youtube)
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
