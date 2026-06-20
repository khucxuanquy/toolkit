/**
 * Multi-source media helpers — client-safe (no server env vars).
 *
 * Detects the provider from a pasted URL and fetches lightweight metadata via
 * each provider's public oEmbed endpoint (no API key needed). YouTube also has
 * full playback sync via the IFrame API (see youtube.ts); the other providers
 * are rendered as their official embed and sync only *which* track is current
 * (not the exact position), since their embeds don't expose a JS control API.
 */

export type Source = "youtube" | "spotify" | "soundcloud" | "tiktok";

export interface MediaMeta {
  source: Source;
  sourceId: string; // youtube video id; for others a stable id or the path
  url: string; // canonical original URL (used by SoundCloud embed)
  embedUrl: string; // iframe src for non-youtube providers ("" for youtube)
  title: string;
  thumbnail: string;
  channel: string;
  duration: string | null;
}

/** Back-compat alias — search results and queue items share this shape. */
export type VideoMeta = MediaMeta;

// ── YouTube ────────────────────────────────────────────────────────────────
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/, // bare ID
  ];
  for (const re of patterns) {
    const m = url.trim().match(re);
    if (m) return m[1];
  }
  return null;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

// ── Source detection ─────────────────────────────────────────────────────────
interface Parsed {
  source: Source;
  sourceId: string;
  url: string;
  embedUrl: string;
}

export function detectSource(input: string): Parsed | null {
  const url = input.trim();

  const yt = extractVideoId(url);
  if (yt) {
    return { source: "youtube", sourceId: yt, url: watchUrl(yt), embedUrl: "" };
  }

  const sp = url.match(
    /open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show)\/([A-Za-z0-9]+)/,
  );
  if (sp) {
    const [, type, id] = sp;
    return {
      source: "spotify",
      sourceId: `${type}/${id}`,
      url: `https://open.spotify.com/${type}/${id}`,
      embedUrl: `https://open.spotify.com/embed/${type}/${id}`,
    };
  }

  if (/soundcloud\.com\/[^/]+\/[^/?#]+/.test(url)) {
    const clean = url.split(/[?#]/)[0];
    return {
      source: "soundcloud",
      sourceId: clean.replace(/^https?:\/\/(www\.)?soundcloud\.com\//, ""),
      url: clean,
      embedUrl: `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        clean,
      )}&auto_play=true&hide_related=true&show_comments=false&visual=true`,
    };
  }

  const tk = url.match(/tiktok\.com\/(?:@[^/]+\/video\/|v\/|embed\/(?:v2\/)?)(\d+)/);
  if (tk) {
    return {
      source: "tiktok",
      sourceId: tk[1],
      url,
      embedUrl: `https://www.tiktok.com/embed/v2/${tk[1]}`,
    };
  }
  // Short TikTok links (vm.tiktok.com/...) can't be resolved client-side; reject.

  return null;
}

/** True when the pasted text matches any supported provider URL. */
export function isMediaUrl(input: string): boolean {
  return detectSource(input) !== null;
}

// ── Metadata via oEmbed (no key) ──────────────────────────────────────────────
const OEMBED: Record<Source, (url: string) => string> = {
  youtube: (u) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  spotify: (u) => `https://open.spotify.com/oembed?url=${encodeURIComponent(u)}`,
  soundcloud: (u) => `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(u)}`,
  tiktok: (u) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
};

const SOURCE_LABEL: Record<Source, string> = {
  youtube: "YouTube",
  spotify: "Spotify",
  soundcloud: "SoundCloud",
  tiktok: "TikTok",
};

/** Resolve title/thumbnail/channel for any supported URL. Never hard-fails for
 *  a recognised URL — falls back to a generic label if oEmbed is unreachable. */
export async function fetchMediaMeta(input: string): Promise<MediaMeta> {
  const parsed = detectSource(input);
  if (!parsed) throw new Error("mr.errorUrl");

  const base: MediaMeta = {
    ...parsed,
    title: SOURCE_LABEL[parsed.source],
    thumbnail:
      parsed.source === "youtube"
        ? `https://i.ytimg.com/vi/${parsed.sourceId}/mqdefault.jpg`
        : "",
    channel: SOURCE_LABEL[parsed.source],
    duration: null,
  };

  try {
    const res = await fetch(OEMBED[parsed.source](parsed.url));
    if (!res.ok) return base;
    const data = await res.json();
    return {
      ...base,
      title: data.title ?? base.title,
      thumbnail:
        parsed.source === "youtube"
          ? base.thumbnail
          : (data.thumbnail_url ?? base.thumbnail),
      channel: data.author_name ?? base.channel,
    };
  } catch {
    return base; // CORS/network hiccup — still add the track with a label.
  }
}
