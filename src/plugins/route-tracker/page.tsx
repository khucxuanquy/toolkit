"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button, Card, CardBody, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { sound } from "@/shared/lib/sound";
import { MAPBOX_TOKEN } from "./config";
import { routeStorage, type TrackPoint } from "./storage";

const DEFAULT_CENTER: [number, number] = [105.8542, 21.0285]; // Hà Nội

/** Haversine distance (metres) between two [lng, lat] points. */
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

function fmtDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  if (mm >= 60) return `${Math.floor(mm / 60)}h ${mm % 60}m`;
  return `${mm}m ${String(ss).padStart(2, "0")}s`;
}

const lineGeoJSON = (points: TrackPoint[]) => ({
  type: "Feature" as const,
  properties: {},
  geometry: { type: "LineString" as const, coordinates: points.map((p) => [p.lng, p.lat]) },
});

export default function RouteTrackerPage() {
  const { t } = useTranslation();
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const pointsRef = useRef<TrackPoint[]>([]);
  const watchRef = useRef<number | null>(null);
  const readyRef = useRef(false);

  const [ready, setReady] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [points, setPoints] = useState<TrackPoint[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasToken = MAPBOX_TOKEN.length > 0;
  const hasGeo = typeof navigator !== "undefined" && "geolocation" in navigator;

  const drawLine = useCallback(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const src = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    src?.setData(lineGeoJSON(pointsRef.current));
  }, []);

  const placeMarker = useCallback((p: TrackPoint) => {
    const map = mapRef.current;
    if (!map) return;
    if (!markerRef.current) {
      const el = document.createElement("div");
      el.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#10b981;border:3px solid #fff;box-shadow:0 0 0 2px rgba(16,185,129,0.4)";
      markerRef.current = new mapboxgl.Marker({ element: el });
    }
    markerRef.current.setLngLat([p.lng, p.lat]).addTo(map);
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

      // Restore the last recorded track, if any.
      void routeStorage.loadTrack().then((saved) => {
        if (!saved.length) return;
        pointsRef.current = saved;
        setPoints(saved);
        drawLine();
        placeMarker(saved[saved.length - 1]);
        const b = new mapboxgl.LngLatBounds();
        saved.forEach((p) => b.extend([p.lng, p.lat]));
        map.fitBounds(b, { padding: 60, maxZoom: 16, duration: 0 });
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      readyRef.current = false;
    };
  }, [hasToken, drawLine, placeMarker]);

  const onPosition = useCallback(
    (pos: GeolocationPosition) => {
      const p: TrackPoint = {
        lng: pos.coords.longitude,
        lat: pos.coords.latitude,
        t: pos.timestamp,
      };
      const prev = pointsRef.current[pointsRef.current.length - 1];
      // Skip near-duplicate jitter (< 1.5 m).
      if (prev && distanceM(prev, p) < 1.5) return;
      const next = [...pointsRef.current, p];
      pointsRef.current = next;
      setPoints(next);
      drawLine();
      placeMarker(p);
      mapRef.current?.easeTo({ center: [p.lng, p.lat], duration: 600 });
    },
    [drawLine, placeMarker],
  );

  const start = useCallback(() => {
    if (!hasGeo) {
      setError(t("rt.noGeo"));
      return;
    }
    setError(null);
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
  }, [hasGeo, onPosition, t]);

  const stop = useCallback(() => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setTracking(false);
    sound.click();
    void routeStorage.saveTrack(pointsRef.current);
  }, []);

  const clear = useCallback(() => {
    pointsRef.current = [];
    setPoints([]);
    drawLine();
    markerRef.current?.remove();
    markerRef.current = null;
    void routeStorage.saveTrack([]);
  }, [drawLine]);

  // Stop watching on unmount.
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  const dist = totalDistance(points);
  const duration = points.length >= 2 ? points[points.length - 1].t - points[0].t : 0;

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
        <Stat label={t("rt.distance")} value={fmtDistance(dist)} />
        <Stat label={t("rt.duration")} value={points.length >= 2 ? fmtDuration(duration) : "—"} />
        <Stat label={t("rt.points")} value={String(points.length)} />
      </div>

      <div
        ref={mapContainer}
        className="border-border h-[58vh] min-h-80 w-full overflow-hidden rounded-2xl border"
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
        <Button
          size="lg"
          variant="outline"
          onClick={clear}
          disabled={tracking || points.length === 0}
          className="whitespace-nowrap"
        >
          <Icon name="Trash2" size={16} /> {t("rt.clear")}
        </Button>
      </div>

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
