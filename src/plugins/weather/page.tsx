"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { Icon } from "@/shared/ui/Icon";
import { useTranslation } from "@/core/i18n/useTranslation";
import {
  fetchWeather,
  searchCity,
  wmoInfo,
  windDir,
  HANOI,
  type GeoResult,
  type WeatherData,
  type DailyPoint,
  type HourlyPoint,
} from "./api";

// ─── helpers ───────────────────────────────────────────────────────────────

function fmtHour(iso: string) {
  const d = new Date(iso);
  return d.getHours().toString().padStart(2, "0") + ":00";
}

function fmtDay(dateStr: string, locale: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { weekday: "short", month: "numeric", day: "numeric" });
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

// ─── sub-components ────────────────────────────────────────────────────────

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-white/60 text-xs">
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>
      <span className="text-white font-semibold text-sm">{value}</span>
    </div>
  );
}

function HourlyCard({ h }: { h: HourlyPoint }) {
  const info = wmoInfo(h.weatherCode, h.isDay);
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/10 px-3 py-3 min-w-[64px] backdrop-blur-sm">
      <span className="text-white/60 text-xs">{fmtHour(h.time)}</span>
      <span className="text-xl">{info.emoji}</span>
      <span className="text-white font-semibold text-sm">{h.temp}°</span>
      {h.precipProb > 0 && (
        <span className="text-blue-200 text-xs">{h.precipProb}%</span>
      )}
    </div>
  );
}

function DailyRow({ d, locale }: { d: DailyPoint; locale: string }) {
  const info = wmoInfo(d.weatherCode, true);
  const today = isToday(d.time);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-sm", today ? "bg-white/20" : "bg-white/10")}>
      <span className="text-white/70 text-sm w-[90px] shrink-0">
        {today ? "Hôm nay" : fmtDay(d.time, locale)}
      </span>
      <span className="text-xl w-8 text-center shrink-0">{info.emoji}</span>
      <span className="text-white/60 text-xs flex-1 truncate">{locale === "vi" ? info.vi : info.en}</span>
      {d.precipProb > 0 && (
        <span className="text-blue-200 text-xs flex items-center gap-0.5">
          <Icon name="Droplets" size={11} />
          {d.precipProb}%
        </span>
      )}
      <div className="flex items-center gap-2 shrink-0 ml-auto">
        <span className="text-white font-semibold text-sm">{d.tempMax}°</span>
        <span className="text-white/50 text-sm">{d.tempMin}°</span>
      </div>
    </div>
  );
}

// ─── city search ───────────────────────────────────────────────────────────

function CitySearch({
  onSelect,
  onClose,
}: {
  onSelect: (g: GeoResult) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleChange = (v: string) => {
    setQuery(v);
    clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await searchCity(v)); }
      finally { setLoading(false); }
    }, 400);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2">
          <Icon name="Search" size={15} className="text-white/60 shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
            placeholder="Tên thành phố..."
            value={query}
            onChange={(e) => handleChange(e.target.value)}
          />
          {loading && <Icon name="Loader2" size={14} className="text-white/60 animate-spin" />}
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white p-1">
          <Icon name="X" size={18} />
        </button>
      </div>
      {results.length > 0 && (
        <div className="flex flex-col gap-1">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => onSelect(r)}
              className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-2.5 text-left transition-colors"
            >
              <Icon name="MapPin" size={14} className="text-white/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{r.name}</div>
                <div className="text-white/50 text-xs truncate">{[r.admin1, r.country].filter(Boolean).join(", ")}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────────────────────

export default function WeatherPage() {
  const { t, locale } = useTranslation();
  const [location, setLocation] = useState<GeoResult>(HANOI);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  const load = useCallback(async (loc: GeoResult) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(loc.latitude, loc.longitude);
      setWeather(data);
    } catch {
      setError(t("wt.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(location); }, [location, load]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse geocode via Open-Meteo: use lat/lon directly, set a generic name
        try {
          const res = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=a&count=1&format=json`,
          );
          // Just create a pseudo-location with coordinates
          void res;
        } catch { /* ignore */ }
        setLocation({ id: -1, name: t("wt.currentLocation"), country: "", latitude, longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    );
  };

  // Gradient based on time of day + weather code
  const isDay = weather?.current.isDay ?? true;
  const code = weather?.current.weatherCode ?? 0;
  const isStorm = code >= 95;
  const isRain = code >= 51 && code < 95;
  const isSnow = code >= 70 && code < 80;

  const gradientClass = isStorm
    ? "from-slate-700 via-slate-600 to-slate-500"
    : isSnow
    ? "from-sky-300 via-blue-200 to-indigo-300"
    : isRain
    ? "from-slate-500 via-blue-500 to-sky-600"
    : isDay
    ? "from-sky-400 via-blue-500 to-indigo-500"
    : "from-indigo-900 via-slate-800 to-blue-900";

  const info = weather ? wmoInfo(weather.current.weatherCode, weather.current.isDay) : null;

  // Next 12 hours (from now)
  const now = new Date();
  const hourlySlice = (weather?.hourly ?? [])
    .filter((h) => new Date(h.time) >= now)
    .slice(0, 12);

  return (
    <div className={cn("min-h-screen bg-gradient-to-br transition-all duration-700", gradientClass)}>
      <div className="mx-auto max-w-lg px-4 py-6 flex flex-col gap-5">

        {/* location bar */}
        <div className="flex items-center gap-2">
          {searching ? (
            <CitySearch onSelect={(g) => { setLocation(g); setSearching(false); }} onClose={() => setSearching(false)} />
          ) : (
            <>
              <button
                onClick={() => setSearching(true)}
                className="flex-1 flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 px-3 py-2 transition-colors text-left"
              >
                <Icon name="MapPin" size={16} className="text-white/70 shrink-0" />
                <span className="text-white font-medium text-sm truncate">{location.name}{location.country && location.country !== "VN" ? `, ${location.country}` : ""}</span>
                <Icon name="Search" size={14} className="text-white/50 shrink-0 ml-auto" />
              </button>
              <button
                onClick={handleLocate}
                disabled={geoLoading}
                className="rounded-xl bg-white/20 hover:bg-white/30 p-2.5 transition-colors text-white disabled:opacity-50"
                title={t("wt.locate")}
              >
                {geoLoading
                  ? <Icon name="Loader2" size={18} className="animate-spin" />
                  : <Icon name="Locate" size={18} />
                }
              </button>
              <button
                onClick={() => void load(location)}
                className="rounded-xl bg-white/20 hover:bg-white/30 p-2.5 transition-colors text-white"
                title={t("wt.refresh")}
              >
                <Icon name="RotateCcw" size={18} />
              </button>
            </>
          )}
        </div>

        {/* current weather */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Icon name="Loader2" size={36} className="text-white animate-spin" />
          </div>
        ) : error ? (
          <div className="text-white/80 text-center py-10">{error}</div>
        ) : weather && info ? (
          <>
            {/* main card */}
            <div className="rounded-3xl bg-white/15 backdrop-blur-md p-6 flex flex-col gap-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-white/70 text-sm">{locale === "vi" ? info.vi : info.en}</div>
                  <div className="text-white font-bold" style={{ fontSize: "5rem", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {weather.current.temp}°
                  </div>
                  <div className="text-white/60 text-sm mt-1">{t("wt.feelsLike")} {weather.current.feelsLike}°</div>
                </div>
                <div className="text-[5rem] leading-none select-none">{info.emoji}</div>
              </div>

              {/* stat grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 sm:grid-cols-4">
                <StatCard icon="Droplets" label={t("wt.humidity")} value={`${weather.current.humidity}%`} />
                <StatCard icon="Wind" label={t("wt.wind")} value={`${weather.current.windSpeed} km/h ${windDir(weather.current.windDirection)}`} />
                <StatCard icon="Eye" label={t("wt.visibility")} value={`${weather.current.visibility} km`} />
                <StatCard icon="Gauge" label={t("wt.pressure")} value={`${weather.current.pressure} hPa`} />
              </div>

              {/* UV & sunrise/sunset */}
              {weather.daily[0] && (
                <div className="flex items-center gap-4 mt-3 text-white/60 text-xs">
                  <span className="flex items-center gap-1"><Icon name="Sun" size={13} /> UV {weather.daily[0].uvIndex.toFixed(1)}</span>
                  <span className="flex items-center gap-1">🌅 {weather.daily[0].sunrise.slice(-5)}</span>
                  <span className="flex items-center gap-1">🌇 {weather.daily[0].sunset.slice(-5)}</span>
                </div>
              )}
            </div>

            {/* hourly */}
            {hourlySlice.length > 0 && (
              <div>
                <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{t("wt.hourly")}</h3>
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {hourlySlice.map((h) => <HourlyCard key={h.time} h={h} />)}
                </div>
              </div>
            )}

            {/* daily */}
            {weather.daily.length > 0 && (
              <div>
                <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{t("wt.daily")}</h3>
                <div className="flex flex-col gap-2">
                  {weather.daily.map((d) => <DailyRow key={d.time} d={d} locale={locale} />)}
                </div>
              </div>
            )}

            <p className="text-white/30 text-xs text-center mt-1">Open-Meteo · {t("wt.freeSource")}</p>
          </>
        ) : null}
      </div>
    </div>
  );
}
