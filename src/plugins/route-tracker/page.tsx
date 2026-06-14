"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button, Card, CardBody, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { cn } from "@/shared/utils/cn";
import { MAPBOX_TOKEN } from "./config";
import { routeStorage, type TrackPoint, type TrackSession } from "./storage";

const DEFAULT_CENTER: [number, number] = [105.8542, 21.0285]; // Hà Nội
const PLAYBACK_MS = 6000;

/** Haversine distance (metres) between two points. */
function distanceM(a: TrackPoint, b: TrackPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function totalDistance(points: TrackPoint[]): number {
  let d = 0;
  for (let i = 1; i < points.length; i += 1) d += distanceM(points[i - 1], points[i]);
  return d;
}

/** Cumulative distance at each point (cum[0] = 0). */
function cumulative(points: TrackPoint[]): number[] {
  const cum = [0];
  for (let i = 1; i < points.length; i += 1)
    cum[i] = cum[i - 1] + distanceM(points[i - 1], points[i]);
  return cum;
}

/** Coordinates from the start up to `target` metres along the path (head interpolated). */
function coordsUpTo(points: TrackPoint[], cum: number[], target: number): [number, number][] {
  if (target <= 0) return [[points[0].lng, points[0].lat]];
  const total = cum[cum.length - 1];
  if (target >= total) return points.map((p) => [p.lng, p.lat]);
  let k = 1;
  while (k < cum.length && cum[k] < target) k += 1;
  const f = (target - cum[k - 1]) / (cum[k] - cum[k - 1] || 1);
  const a = points[k - 1];
  const b = points[k];
  const coords = points.slice(0, k).map((p) => [p.lng, p.lat] as [number, number]);
  coords.push([a.lng + (b.lng - a.lng) * f, a.lat + (b.lat - a.lat) * f]);
  return coords;
}

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  if (mm >= 60) return `${Math.floor(mm / 60)}h ${mm % 60}m`;
  return `${mm}m ${String(s % 60).padStart(2, "0")}s`;
}
const lineGeoJSON = (coords: [number, number][]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: coords },
});

export default function RouteTrackerPage() {
  const { t, locale } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const watchRef = useRef<number | null>(null);
  const playbackRaf = useRef<number | null>(null);
  const readyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [sessions, setSessions] = useState<TrackSession[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasToken = MAPBOX_TOKEN.length > 0;
  const hasGeo = typeof navigator !== "undefined" && "geolocation" in navigator;

  const setRouteData = useCallback((coords: [number, number][]) => {
    const src = mapRef.current?.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(lineGeoJSON(coords));
  }, []);

  const setMarker = useCallback((lng: number, lat: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.4)";
      markerRef.current = new mapboxgl.Marker({ element: el });
    }
    markerRef.current.setLngLat([lng, lat]).addTo(map);
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackRaf.current !== null) {
      cancelAnimationFrame(playbackRaf.current);
      playbackRaf.current = null;
    }
  }, []);

  // Initialise the map once.
  useEffect(() => {
    if (!hasToken || !mapContainer.current || mapRef.current) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: 14,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("route", { type: "geojson", data: lineGeoJSON([]) });
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#10b981", "line-width": 5, "line-opacity": 0.9 },
      });
      readyRef.current = true;
      setReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      readyRef.current = false;
    };
  }, [hasToken]);

  // Load saved sessions once.
  useEffect(() => {
    let active = true;
    void routeStorage.loadSessions().then((s) => {
      if (active) setSessions(s);
    });
    return () => {
      active = false;
    };
  }, []);

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      const p: TrackPoint = {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
        t: pos.timestamp,
      };
      const prev = pointsRef.current[pointsRef.current.length - 1];
      if (prev && distanceM(prev, p) < 1.5) return; // skip GPS jitter
      const next = [...pointsRef.current, p];
      pointsRef.current = next;
      setPoints(next);
      setRouteData(next.map((q) => [q.lng, q.lat]));
      setMarker(p.lng, p.lat);
      mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 600 });
    },
    [setRouteData, setMarker],
  );

  const start = useCallback(() => {
    if (!hasGeo) {
      setError(t("rt.noGeo"));
      return;
    }
    stopPlayback();
    setError(null);
    setSelectedId(null);
    setPlaying(false);
    pointsRef.current = [];
    setPoints([]);
    setRouteData([]);
    markerRef.current?.remove();
    markerRef.current = null;
    sound.click();
    setTracking(true);
    watchRef.current = navigator.geolocation.watchPosition(
      onPosition,
      (err) => {
        setError(err.code === err.PERMISSION_DENIED ? t("rt.denied") : t("rt.geoError"));
        setTracking(false);
        if (watchRef.current !== null) {
          navigator.geolocation.clearWatch(watchRef.current);
          watchRef.current = null;
        }
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 20000 },
    );
  }, [hasGeo, onPosition, setRouteData, stopPlayback, t]);

  const stop = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    sound.click();
    const pts = pointsRef.current;
    if (pts.length < 2) return; // nothing worth saving
    const session: TrackSession = {
      id: `s-${pts[0].t}`,
      startedAt: pts[0].t,
      durationMs: pts[pts.length - 1].t - pts[0].t,
      distanceM: totalDistance(pts),
      points: pts,
    };
    setSessions((prev) => {
      const next = [session, ...prev.filter((s) => s.id !== session.id)];
      void routeStorage.saveSessions(next);
      return next;
    });
    setSelectedId(session.id);
  }, []);

  // Play a saved session: the marker travels start → end while the line draws.
  const play = useCallback(
    (session: TrackSession) => {
      const map = mapRef.current;
      if (!map || !readyRef.current) return;
      stopPlayback();
      const pts = session.points;
      setSelectedId(session.id);
      setError(null);

      const bounds = new mapboxgl.LngLatBounds();
      pts.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 500 });

      if (pts.length < 2) {
        setRouteData(pts.map((p) => [p.lng, p.lat]));
        if (pts[0]) setMarker(pts[0].lng, pts[0].lat);
        return;
      }

      const cum = cumulative(pts);
      const total = cum[cum.length - 1];
      setRouteData([[pts[0].lng, pts[0].lat]]);
      setMarker(pts[0].lng, pts[0].lat);
      setPlaying(true);
      let startTime = 0;
      const loop = (now: number) => {
        if (!startTime) startTime = now;
        const p = Math.min(1, (now - startTime) / PLAYBACK_MS);
        const eased = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
        const coords = coordsUpTo(pts, cum, eased * total);
        setRouteData(coords);
        const head = coords[coords.length - 1];
        setMarker(head[0], head[1]);
        if (p < 1) {
          playbackRaf.current = requestAnimationFrame(loop);
        } else {
          playbackRaf.current = null;
          setPlaying(false);
        }
      };
      playbackRaf.current = requestAnimationFrame(loop);
    },
    [setRouteData, setMarker, stopPlayback],
  );

  const deleteSession = useCallback(
    (id: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        void routeStorage.saveSessions(next);
        return next;
      });
      if (selectedId === id) {
        stopPlayback();
        setSelectedId(null);
        setPlaying(false);
        setRouteData([]);
        markerRef.current?.remove();
        markerRef.current = null;
      }
    },
    [selectedId, setRouteData, stopPlayback],
  );

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
      if (playbackRaf.current !== null) cancelAnimationFrame(playbackRaf.current);
    };
  }, []);

  const selected = sessions.find((s) => s.id === selectedId) ?? null;
  const statDist = selected ? selected.distanceM : totalDistance(points);
  const statDur = selected
    ? selected.durationMs
    : points.length >= 2
      ? points[points.length - 1].t - points[0].t
      : 0;
  const statPts = selected ? selected.points.length : points.length;
  const dateFmt = (ts: number) =>
    new Date(ts).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (!hasToken) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="space-y-2 py-10 text-center">
          <Icon name="MapPin" size={32} className="text-muted mx-auto" />
          <p className="text-muted text-sm">{t("rt.noToken")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat label={t("rt.distance")} value={fmtDistance(statDist)} />
        <Stat label={t("rt.duration")} value={statPts >= 2 ? fmtDuration(statDur) : "—"} />
        <Stat label={t("rt.points")} value={String(statPts)} />
      </div>

      <div
        ref={mapContainer}
        className="border-border h-[52vh] min-h-72 w-full overflow-hidden rounded-2xl border"
      />

      {error && (
        <p className="border-danger/40 bg-danger/10 text-danger rounded-xl border p-3 text-center text-sm">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {!tracking ? (
          <Button
            size="lg"
            onClick={start}
            disabled={!ready}
            className="min-w-40 whitespace-nowrap"
          >
            <Icon name="Navigation" size={18} /> {t("rt.start")}
          </Button>
        ) : (
          <Button size="lg" variant="danger" onClick={stop} className="min-w-40 whitespace-nowrap">
            <Icon name="Square" size={16} /> {t("rt.stop")}
          </Button>
        )}
        {selected && !tracking && (
          <Button
            size="lg"
            variant="outline"
            onClick={() => play(selected)}
            disabled={playing}
            className="whitespace-nowrap"
          >
            <Icon name="Play" size={16} /> {playing ? t("rt.playing") : t("rt.replay")}
          </Button>
        )}
      </div>

      {/* Saved routes */}
      <Card>
        <CardBody className="space-y-2">
          <h3 className="font-semibold">{t("rt.savedRoutes")}</h3>
          {sessions.length === 0 ? (
            <p className="text-muted py-4 text-center text-sm">{t("rt.noSaved")}</p>
          ) : (
            <ul className="space-y-1.5">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    s.id === selectedId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-surface",
                  )}
                >
                  <button
                    onClick={() => play(s)}
                    disabled={tracking}
                    className="flex flex-1 items-center gap-3 text-left disabled:opacity-50"
                  >
                    <Icon name="Route" size={16} className="text-primary" />
                    <span className="flex-1">
                      <span className="font-medium">{fmtDistance(s.distanceM)}</span>
                      <span className="text-muted"> · {fmtDuration(s.durationMs)}</span>
                      <span className="text-muted block text-xs">{dateFmt(s.startedAt)}</span>
                    </span>
                  </button>
                  <button
                    onClick={() => deleteSession(s.id)}
                    aria-label={t("rt.deleteRoute")}
                    className="text-muted hover:text-danger"
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <p className="text-muted text-center text-sm">{t("rt.howto")}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-2 rounded-xl px-3 py-2 text-center">
      <div className="text-muted text-xs tracking-wide uppercase">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
