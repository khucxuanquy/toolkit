import { createNamespace } from "@/core/storage/storage";

export interface TrackPoint {
  lng: number;
  lat: number;
  t: number; // timestamp (ms)
}

/** A completed tracking session, saved after the user taps Stop. */
export interface TrackSession {
  id: string;
  startedAt: number; // first point timestamp
  durationMs: number;
  distanceM: number;
  points: TrackPoint[];
}

const store = createNamespace("route-tracker");
const KEY = "sessions";

export const routeStorage = {
  loadSessions: () => store.load<TrackSession[]>(KEY, []),
  saveSessions: (sessions: TrackSession[]) => store.save(KEY, sessions),
};
