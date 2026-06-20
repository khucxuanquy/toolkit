"use client";

export interface GeoResult {
  id: number;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
}

export interface WeatherData {
  current: {
    temp: number;
    feelsLike: number;
    humidity: number;
    windSpeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
    uvIndex: number;
    visibility: number;
    pressure: number;
  };
  hourly: HourlyPoint[];
  daily: DailyPoint[];
}

export interface HourlyPoint {
  time: string; // ISO
  temp: number;
  weatherCode: number;
  precipProb: number;
  isDay: boolean;
}

export interface DailyPoint {
  time: string; // YYYY-MM-DD
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipSum: number;
  precipProb: number;
  windMax: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
}

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

export async function searchCity(query: string): Promise<GeoResult[]> {
  const url = `${GEO_URL}?name=${encodeURIComponent(query)}&count=6&language=vi&format=json`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: GeoResult[] };
  return data.results ?? [];
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "wind_speed_10m",
      "wind_direction_10m",
      "weather_code",
      "is_day",
      "uv_index",
      "visibility",
      "surface_pressure",
    ].join(","),
    hourly: ["temperature_2m", "weather_code", "precipitation_probability", "is_day"].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "uv_index_max",
      "sunrise",
      "sunset",
    ].join(","),
    timezone: "auto",
    forecast_days: "7",
    forecast_hours: "24",
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error("weather_fetch_failed");
  const d = await res.json();
  const c = d.current;
  const h = d.hourly;
  const dd = d.daily;
  return {
    current: {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      humidity: c.relative_humidity_2m,
      windSpeed: Math.round(c.wind_speed_10m),
      windDirection: c.wind_direction_10m,
      weatherCode: c.weather_code,
      isDay: c.is_day === 1,
      uvIndex: c.uv_index ?? 0,
      visibility: Math.round((c.visibility ?? 0) / 1000),
      pressure: Math.round(c.surface_pressure ?? 0),
    },
    hourly: h.time.map((t: string, i: number) => ({
      time: t,
      temp: Math.round(h.temperature_2m[i]),
      weatherCode: h.weather_code[i],
      precipProb: h.precipitation_probability[i] ?? 0,
      isDay: h.is_day[i] === 1,
    })),
    daily: dd.time.map((t: string, i: number) => ({
      time: t,
      weatherCode: dd.weather_code[i],
      tempMax: Math.round(dd.temperature_2m_max[i]),
      tempMin: Math.round(dd.temperature_2m_min[i]),
      precipSum: dd.precipitation_sum[i] ?? 0,
      precipProb: dd.precipitation_probability_max[i] ?? 0,
      windMax: Math.round(dd.wind_speed_10m_max[i]),
      uvIndex: dd.uv_index_max[i] ?? 0,
      sunrise: dd.sunrise[i],
      sunset: dd.sunset[i],
    })),
  };
}

/** WMO weather code → { label_vi, label_en, icon, emoji } */
export interface WMOInfo {
  vi: string;
  en: string;
  icon: string; // lucide icon name
  emoji: string;
}

export function wmoInfo(code: number, isDay = true): WMOInfo {
  if (code === 0) return isDay ? { vi: "Quang đãng", en: "Clear sky", icon: "Sun", emoji: "☀️" } : { vi: "Trời quang", en: "Clear sky", icon: "Moon", emoji: "🌙" };
  if (code === 1) return isDay ? { vi: "Chủ yếu quang", en: "Mainly clear", icon: "CloudSun", emoji: "🌤️" } : { vi: "Chủ yếu quang", en: "Mainly clear", icon: "Cloud", emoji: "🌤️" };
  if (code === 2) return { vi: "Có mây rải rác", en: "Partly cloudy", icon: "CloudSun", emoji: "⛅" };
  if (code === 3) return { vi: "Nhiều mây", en: "Overcast", icon: "Cloud", emoji: "☁️" };
  if (code <= 49) return { vi: "Sương mù", en: "Foggy", icon: "CloudFog", emoji: "🌫️" };
  if (code <= 59) return { vi: "Mưa phùn", en: "Drizzle", icon: "CloudDrizzle", emoji: "🌦️" };
  if (code <= 69) return { vi: "Mưa", en: "Rain", icon: "CloudRain", emoji: "🌧️" };
  if (code <= 79) return { vi: "Tuyết", en: "Snow", icon: "CloudSnow", emoji: "❄️" };
  if (code <= 84) return { vi: "Mưa rào", en: "Rain showers", icon: "CloudRain", emoji: "🌦️" };
  if (code <= 94) return { vi: "Mưa tuyết", en: "Snow showers", icon: "Snowflake", emoji: "🌨️" };
  return { vi: "Giông bão", en: "Thunderstorm", icon: "CloudLightning", emoji: "⛈️" };
}

export function windDir(deg: number): string {
  const dirs = ["B", "ĐB", "Đ", "ĐN", "N", "TN", "T", "TB"];
  return dirs[Math.round(deg / 45) % 8];
}

export const HANOI: GeoResult = {
  id: 0,
  name: "Hà Nội",
  country: "VN",
  admin1: "Hà Nội",
  latitude: 21.0285,
  longitude: 105.8542,
};
