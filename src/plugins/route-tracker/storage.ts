import { createNamespace } from "@/core/storage/storage";

export interface TrackPoint {
  lng: number;
  lat: number;
  t: number; // timestamp (ms)
}

const store = createNamespace("route-tracker");
const KEY = "track";

export const routeStorage = {
  loadTrack: () => store.load<TrackPoint[]>(KEY, []),
  saveTrack: (points: TrackPoint[]) => store.save(KEY, points),
};
