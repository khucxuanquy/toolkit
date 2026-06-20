/** YouTube helpers — client-safe (no server env vars). */

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/, // bare ID
  ];
  for (const re of patterns) {
    const m = url.trim().match(re);
    if (m) return m[1];
  }
  return null;
}

export interface VideoMeta {
  sourceId: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: string | null;
}

export async function fetchVideoMeta(videoId: string): Promise<VideoMeta> {
  const res = await fetch(
    `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
  );
  if (!res.ok) throw new Error("mr.errorUrl");
  const data = await res.json();
  return {
    sourceId: videoId,
    title: data.title ?? "Unknown",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    channel: data.author_name ?? "",
    duration: null, // oEmbed doesn't expose duration
  };
}

// ── Search (YouTube Data API v3) ──────────────────────────────────────────────
// Uses a public, referrer-restricted browser key. When absent, search is hidden
// and users fall back to pasting URLs.
const YT_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY ?? "";
export const youtubeSearchEnabled = YT_KEY.length > 0;

const YT_API = "https://www.googleapis.com/youtube/v3";

/** Convert ISO 8601 duration (PT3M45S) → "3:45". */
function parseDuration(iso: string): string {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return "";
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  const mm = h > 0 ? `${h}:${String(min).padStart(2, "0")}` : String(min);
  return `${mm}:${String(s).padStart(2, "0")}`;
}

async function fetchDurations(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const url = new URL(`${YT_API}/videos`);
  url.searchParams.set("part", "contentDetails");
  url.searchParams.set("id", ids.join(","));
  url.searchParams.set("key", YT_KEY);
  const res = await fetch(url.toString());
  if (!res.ok) return {};
  const data = await res.json();
  const map: Record<string, string> = {};
  for (const item of data.items ?? []) {
    map[item.id] = parseDuration(item.contentDetails?.duration ?? "");
  }
  return map;
}

export async function searchYouTube(query: string, maxResults = 12): Promise<VideoMeta[]> {
  if (!youtubeSearchEnabled || !query.trim()) return [];
  const url = new URL(`${YT_API}/search`);
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(maxResults));
  url.searchParams.set("key", YT_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("mr.searchError");
  const data = await res.json();

  const items: { id: string; title: string; channel: string; thumbnail: string }[] = (
    data.items ?? []
  )
    .filter((i: { id?: { videoId?: string } }) => i.id?.videoId)
    .map((i: {
      id: { videoId: string };
      snippet: { title: string; channelTitle: string; thumbnails?: { medium?: { url: string } } };
    }) => ({
      id: i.id.videoId,
      title: i.snippet.title,
      channel: i.snippet.channelTitle,
      thumbnail:
        i.snippet.thumbnails?.medium?.url ?? `https://i.ytimg.com/vi/${i.id.videoId}/mqdefault.jpg`,
    }));

  const durations = await fetchDurations(items.map((i) => i.id));
  return items.map((i) => ({
    sourceId: i.id,
    title: i.title,
    thumbnail: i.thumbnail,
    channel: i.channel,
    duration: durations[i.id] ?? null,
  }));
}

/** Build a watchable URL from a video ID. */
export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ── YouTube IFrame API ────────────────────────────────────────────────────────

declare global {
  interface Window {
    YT: {
      Player: new (el: HTMLElement, opts: YTPlayerOpts) => YTPlayer;
      PlayerState: { ENDED: 0; PLAYING: 1; PAUSED: 2; BUFFERING: 3; CUED: 5 };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerOpts {
  videoId?: string;
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, number | string>;
  events?: {
    onReady?: () => void;
    onStateChange?: (e: { data: number }) => void;
  };
}

export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getPlayerState(): number;
  loadVideoById(videoId: string): void;
  destroy(): void;
}

let ytApiPromise: Promise<void> | null = null;

export function ensureYtApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.getElementById("yt-iframe-api")) {
      const s = document.createElement("script");
      s.id = "yt-iframe-api";
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
  return ytApiPromise;
}
