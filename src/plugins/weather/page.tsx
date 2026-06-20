"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/shared/utils/cn";
import { Icon } from "@/shared/ui/Icon";
import { useTranslation } from "@/core/i18n/useTranslation";
import { LineChart } from "./LineChart";
import { WeatherBackground, skyKind, skyGradient } from "./WeatherBackground";
import {
  fetchWeather,
  fetchDaily,
  searchCity,
  wmoInfo,
  windDir,
  HANOI,
  type ForecastDays,
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

function fmtDayShort(dateStr: string, locale: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString(locale === "vi" ? "vi-VN" : "en-US", { month: "numeric", day: "numeric" });
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

function DailyRow({ d, locale, todayLabel }: { d: DailyPoint; locale: string; todayLabel: string }) {
  const info = wmoInfo(d.weatherCode, true);
  const today = isToday(d.time);
  return (
    <div className={cn("flex items-center gap-3 rounded-2xl px-4 py-3 backdrop-blur-sm", today ? "bg-white/20" : "bg-white/10")}>
      <span className="text-white/70 text-sm w-[90px] shrink-0">
        {today ? todayLabel : fmtDay(d.time, locale)}
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

/** A pill toggle group. */
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-sm">
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            value === o.value ? "bg-white text-slate-800 shadow-sm" : "text-white/70 hover:text-white",
          )}
        >
          {o.icon && <Icon name={o.icon} size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── city search ───────────────────────────────────────────────────────────

function CitySearch({
  onSelect,
  onClose,
  lang,
  placeholder,
}: {
  onSelect: (g: GeoResult) => void;
  onClose: () => void;
  lang: string;
  placeholder: string;
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
      try { setResults(await searchCity(v, lang)); }
      finally { setLoading(false); }
    }, 400);
  };

  return (
    <div className="flex flex-col gap-3 flex-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 rounded-xl bg-white/20 px-3 py-2">
          <Icon name="Search" size={15} className="text-white/60 shrink-0" />
          <input
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-white/50 text-sm outline-none"
            placeholder={placeholder}
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

type DailyView = "list" | "chart";

export default function WeatherPage() {
  const { t, locale } = useTranslation();
  const [location, setLocation] = useState<GeoResult>(HANOI);
  const [days, setDays] = useState<ForecastDays>(7);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [hourlyView, setHourlyView] = useState<DailyView>("list");
  const [dailyView, setDailyView] = useState<DailyView>("list");
  const [dailyLoading, setDailyLoading] = useState(false);

  // Full reload: current + hourly + daily. Runs on initial mount and whenever
  // the location changes. Uses the currently-selected range.
  const load = useCallback(async (loc: GeoResult, d: ForecastDays) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWeather(loc.latitude, loc.longitude, d);
      setWeather(data);
    } catch {
      setError(t("wt.error"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Reload only the multi-day section, leaving the rest of the page in place.
  const loadDaily = useCallback(async (loc: GeoResult, d: ForecastDays) => {
    setDailyLoading(true);
    try {
      const { daily, estimated } = await fetchDaily(loc.latitude, loc.longitude, d);
      setWeather((w) => (w ? { ...w, daily, estimated } : w));
    } catch {
      /* keep existing daily data on failure */
    } finally {
      setDailyLoading(false);
    }
  }, []);

  // Only re-run the full load when the location changes (not the day range).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(location, days); }, [location, load]);

  const changeDays = (d: ForecastDays) => {
    if (d === days || dailyLoading) return;
    setDays(d);
    void loadDaily(location, d);
  };

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocation({ id: -1, name: t("wt.currentLocation"), country: "", latitude, longitude });
        setGeoLoading(false);
      },
      () => setGeoLoading(false),
      { timeout: 8000 },
    );
  };

  // Animated sky based on time of day + weather code.
  const isDay = weather?.current.isDay ?? true;
  const code = weather?.current.weatherCode ?? 0;
  const kind = skyKind(code, isDay);
  const gradientClass = skyGradient(kind);

  const info = weather ? wmoInfo(weather.current.weatherCode, weather.current.isDay) : null;

  // Next 12 hours (from now)
  const now = new Date();
  const hourlySlice = (weather?.hourly ?? []).filter((h) => new Date(h.time) >= now);
  const hourly12 = hourlySlice.slice(0, 12);

  const viewOptions = [
    { value: "list" as DailyView, label: t("wt.list"), icon: "ListTodo" },
    { value: "chart" as DailyView, label: t("wt.chart"), icon: "Route" },
  ];

  return (
    <div className={cn("relative min-h-screen bg-gradient-to-br transition-all duration-700", gradientClass)}>
      {weather && !loading && <WeatherBackground kind={kind} />}
      <div className="relative z-10 mx-auto max-w-lg px-4 py-6 flex flex-col gap-5">

        {/* location bar */}
        <div className="flex items-center gap-2">
          {searching ? (
            <CitySearch
              lang={locale}
              placeholder={t("wt.cityPlaceholder")}
              onSelect={(g) => { setLocation(g); setSearching(false); }}
              onClose={() => setSearching(false)}
            />
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
                onClick={() => void load(location, days)}
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
                <StatCard icon="Wind" label={t("wt.wind")} value={`${weather.current.windSpeed} km/h ${windDir(weather.current.windDirection, locale)}`} />
                <StatCard icon="Eye" label={t("wt.visibility")} value={`${weather.current.visibility} km`} />
                <StatCard icon="Gauge" label={t("wt.pressure")} value={`${weather.current.pressure} hPa`} />
              </div>

              {/* UV & sunrise/sunset */}
              {weather.daily[0]?.sunrise && (
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
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider">{t("wt.hourly")}</h3>
                  <Segmented options={viewOptions} value={hourlyView} onChange={setHourlyView} />
                </div>
                {hourlyView === "list" ? (
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {hourly12.map((h) => <HourlyCard key={h.time} h={h} />)}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                    <LineChart
                      series={[{ values: hourlySlice.map((h) => h.temp), color: "#fde047", fill: true, name: t("wt.temp") }]}
                      labels={hourlySlice.map((h) => fmtHour(h.time))}
                      labelEvery={3}
                      height={180}
                    />
                  </div>
                )}
              </div>
            )}

            {/* daily */}
            {weather.daily.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 px-1 gap-2 flex-wrap">
                  <h3 className="text-white/70 text-xs font-semibold uppercase tracking-wider">{t("wt.daily")}</h3>
                  <Segmented options={viewOptions} value={dailyView} onChange={setDailyView} />
                </div>

                {/* range chips */}
                <div className="flex items-center gap-2 mb-3">
                  {([7, 15, 30] as ForecastDays[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => changeDays(d)}
                      disabled={dailyLoading}
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
                        days === d ? "bg-white text-slate-800 shadow-sm" : "bg-white/10 text-white/70 hover:text-white",
                      )}
                    >
                      {t("wt.nDays", { n: d })}
                    </button>
                  ))}
                  {dailyLoading && <Icon name="Loader2" size={16} className="text-white/70 animate-spin" />}
                </div>

                {weather.estimated && (
                  <p className="text-white/50 text-xs mb-2 px-1 flex items-center gap-1">
                    <Icon name="Sparkles" size={12} /> {t("wt.estimated")}
                  </p>
                )}

                {/* fade the section while only the daily portion reloads */}
                <div className={cn("transition-opacity", dailyLoading && "opacity-50")}>
                  {dailyView === "list" ? (
                    <div className="flex flex-col gap-2">
                      {weather.daily.map((d) => (
                        <DailyRow key={d.time} d={d} locale={locale} todayLabel={t("wt.today")} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
                      <div className="flex items-center gap-4 mb-1 px-2 text-xs">
                        <span className="flex items-center gap-1.5 text-white/70">
                          <span className="inline-block w-3 h-0.5 rounded" style={{ background: "#fb923c" }} /> {t("wt.high")}
                        </span>
                        <span className="flex items-center gap-1.5 text-white/70">
                          <span className="inline-block w-3 h-0.5 rounded" style={{ background: "#7dd3fc" }} /> {t("wt.low")}
                        </span>
                      </div>
                      <LineChart
                        series={[
                          { values: weather.daily.map((d) => d.tempMax), color: "#fb923c", name: t("wt.high") },
                          { values: weather.daily.map((d) => d.tempMin), color: "#7dd3fc", name: t("wt.low") },
                        ]}
                        labels={weather.daily.map((d) => fmtDayShort(d.time, locale))}
                        labelEvery={weather.daily.length > 16 ? 5 : weather.daily.length > 9 ? 2 : 1}
                        height={210}
                      />
                    </div>
                  )}
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
