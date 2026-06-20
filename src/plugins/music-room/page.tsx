"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { onValue, ref } from "firebase/database";
import { Button, Card, CardBody, Icon, Input, Modal, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/core/auth/auth-store";
import { realtimeEnabled } from "@/core/firebase/config";
import { getRtdb } from "@/core/firebase/app";
import { checkRoomExists, createRoom, pruneStaleRooms, useFirebaseRoom } from "./useFirebaseRoom";
import { ensureYtApi, searchYouTube, youtubeSearchEnabled, type YTPlayer } from "./youtube";
import { isMediaUrl, type MediaMeta, type Source } from "./sources";
import type { MusicChatMessage, MusicQueueItem, MusicRoom, RoomPresence } from "./types";

// ── Source visual identity ────────────────────────────────────────────────────
const SOURCE_ICON: Record<Source, string> = {
  youtube: "Play",
  spotify: "Music",
  soundcloud: "AudioLines",
  tiktok: "Music2",
};
const SOURCE_COLOR: Record<Source, string> = {
  youtube: "text-red-500",
  spotify: "text-green-500",
  soundcloud: "text-orange-500",
  tiktok: "text-pink-500",
};
function srcOf(item: { source?: Source }): Source {
  return item.source ?? "youtube";
}

// ── Guest ID (persisted in sessionStorage) ───────────────────────────────────
function useGuestId(): string {
  const [id] = useState(() => {
    if (typeof sessionStorage === "undefined") return crypto.randomUUID();
    const stored = sessionStorage.getItem("mr-guest-id");
    if (stored) return stored;
    const next = crypto.randomUUID();
    sessionStorage.setItem("mr-guest-id", next);
    return next;
  });
  return id;
}

// ── YouTube IFrame player component ──────────────────────────────────────────
export interface YTHandle {
  play(): void;
  pause(): void;
  seek(s: number): void;
  getCurrentTime(): number;
  loadVideo(id: string): void;
}

const YouTubePlayer = forwardRef<
  YTHandle,
  {
    videoId: string;
    onStateChange?: (state: number) => void;
  }
>(({ videoId, onStateChange }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const onStateChangeRef = useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  });

  useImperativeHandle(ref, () => ({
    play() {
      playerRef.current?.playVideo();
    },
    pause() {
      playerRef.current?.pauseVideo();
    },
    seek(s) {
      playerRef.current?.seekTo(s, true);
    },
    getCurrentTime() {
      return playerRef.current?.getCurrentTime() ?? 0;
    },
    loadVideo(id) {
      playerRef.current?.loadVideoById(id);
    },
  }));

  useEffect(() => {
    let mounted = true;
    ensureYtApi().then(() => {
      if (!mounted || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, autoplay: 1 },
        events: {
          onStateChange: (e) => onStateChangeRef.current?.(e.data),
        },
      });
    });
    return () => {
      mounted = false;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load new video without destroying the player
  const prevId = useRef(videoId);
  useEffect(() => {
    if (videoId === prevId.current) return;
    prevId.current = videoId;
    playerRef.current?.loadVideoById(videoId);
  }, [videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
});
YouTubePlayer.displayName = "YouTubePlayer";

// ── Embed player (Spotify / SoundCloud / TikTok) ──────────────────────────────
// These providers don't expose a JS control API for cross-client position sync,
// so we render their official embed. Everyone sees the same current track; each
// plays it locally. The host still controls which track is current + skip.
function EmbedPlayer({ item }: { item: MusicQueueItem }) {
  const source = srcOf(item);
  const heights: Record<Source, string> = {
    youtube: "aspect-video",
    spotify: "h-[152px]",
    soundcloud: "h-[166px]",
    tiktok: "h-[640px] max-w-[340px] mx-auto",
  };
  return (
    <div className={cn("w-full overflow-hidden rounded-xl bg-black", heights[source])}>
      <iframe
        key={item.id}
        src={item.embedUrl}
        title={item.title}
        className="h-full w-full"
        allow="autoplay; encrypted-media; clipboard-write; picture-in-picture; fullscreen"
        allowFullScreen
        loading="lazy"
      />
    </div>
  );
}

// ── Animated tab title while music plays ──────────────────────────────────────
// Shows "♫ <track>" in the browser tab, the note pulsing and a long title
// scrolling. Restores the page's own title when nothing is playing / on unmount.
function usePlayingTabTitle(title: string | null) {
  useEffect(() => {
    if (!title) return;
    const original = document.title;
    const notes = ["♫", "♪", "♬", "♩"];
    const label = title.length > 36 ? `${title}    ` : title; // pad for marquee gap
    let frame = 0;
    const tick = () => {
      const note = notes[frame % notes.length];
      const scrolled =
        label.length > 36 ? label.slice(frame % label.length) + label.slice(0, frame % label.length) : label;
      document.title = `${note} ${scrolled.slice(0, 60)}`;
      frame += 1;
    };
    tick();
    const id = setInterval(tick, 600);
    return () => {
      clearInterval(id);
      document.title = original;
    };
  }, [title]);
}

// ── Add-song bar (search or paste URL) ────────────────────────────────────────
function AddSongBar({
  onAddUrl,
  onAddMeta,
}: {
  onAddUrl: (url: string) => Promise<void>;
  onAddMeta: (meta: MediaMeta) => Promise<void>;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<MediaMeta[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // A pasted provider URL (YouTube/Spotify/SoundCloud/TikTok) or a bare YT id.
  const isUrl = (s: string) => isMediaUrl(s) || /^[A-Za-z0-9_-]{11}$/.test(s.trim());
  const looksLikeUrl = isUrl(text);

  // Clean up a pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Debounced search, driven from the input's onChange (not an effect).
  const handleChange = (value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (!youtubeSearchEnabled || !q || isUrl(value)) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setResults(await searchYouTube(q));
      } catch {
        toast(t("mr.searchError"), "error");
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const addUrl = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await onAddUrl(trimmed);
      setText("");
      setResults([]);
    } catch {
      toast(t("mr.errorUrl"), "error");
    } finally {
      setBusy(false);
    }
  };

  const addResult = async (meta: MediaMeta) => {
    setBusy(true);
    try {
      await onAddMeta(meta);
      setText("");
      setResults([]);
      toast(t("mr.added"), "success");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon
            name={youtubeSearchEnabled ? "Search" : "Link"}
            size={15}
            className="text-muted pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          />
          <Input
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={youtubeSearchEnabled ? t("mr.searchPlaceholder") : t("mr.addPlaceholder")}
            onKeyDown={(e) => e.key === "Enter" && looksLikeUrl && addUrl()}
            className="pl-8 text-sm"
          />
          {searching && (
            <Icon
              name="Loader2"
              size={14}
              className="text-muted absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin"
            />
          )}
        </div>
        {looksLikeUrl && (
          <Button size="sm" onClick={addUrl} disabled={busy || !text.trim()}>
            {busy ? (
              <Icon name="Loader2" size={16} className="animate-spin" />
            ) : (
              <Icon name="Plus" size={16} />
            )}
          </Button>
        )}
      </div>

      {/* Search results dropdown */}
      {results.length > 0 && (
        <div className="border-border bg-surface absolute z-20 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border p-1 shadow-lg">
          {results.map((r) => (
            <button
              key={r.sourceId}
              onClick={() => addResult(r)}
              disabled={busy}
              className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg p-1.5 text-left disabled:opacity-50"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.thumbnail} alt="" className="h-9 w-16 shrink-0 rounded object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm leading-tight">{r.title}</p>
                <p className="text-muted truncate text-xs">
                  {r.channel}
                  {r.duration && <span> · {r.duration}</span>}
                </p>
              </div>
              <Icon name="Plus" size={15} className="text-primary shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Queue panel ───────────────────────────────────────────────────────────────
function QueuePanel({
  queue,
  currentItemId,
  isHost,
  onPlay,
  onRemove,
  onAddUrl,
  onAddMeta,
}: {
  queue: MusicQueueItem[];
  currentItemId: string | null;
  isHost: boolean;
  onPlay: (id: string) => void;
  onRemove: (id: string) => void;
  onAddUrl: (url: string) => Promise<void>;
  onAddMeta: (meta: MediaMeta) => Promise<void>;
}) {
  const { t } = useTranslation();
  const toast = useToast();

  const copyUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast(t("mr.copied"), "success");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <AddSongBar onAddUrl={onAddUrl} onAddMeta={onAddMeta} />

      {/* List */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <p className="text-muted pt-8 text-center text-sm">{t("mr.noQueue")}</p>
        ) : (
          <ol className="space-y-1">
            {queue.map((item, i) => (
              <li
                key={item.id}
                className={cn(
                  "group flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm",
                  item.id === currentItemId
                    ? "bg-primary/10 text-primary font-medium"
                    : "hover:bg-surface-2",
                )}
              >
                <span className="text-muted w-5 shrink-0 text-center tabular-nums text-xs">
                  {item.id === currentItemId ? (
                    <Icon name="Music" size={12} className="text-primary" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="relative shrink-0">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt="" className="h-8 w-14 rounded object-cover" />
                  ) : (
                    <span className="bg-surface-2 flex h-8 w-14 items-center justify-center rounded">
                      <Icon
                        name={SOURCE_ICON[srcOf(item)]}
                        size={16}
                        className={SOURCE_COLOR[srcOf(item)]}
                      />
                    </span>
                  )}
                  <Icon
                    name={SOURCE_ICON[srcOf(item)]}
                    size={11}
                    className={cn(
                      "absolute -right-1 -top-1 rounded-full bg-surface p-0.5",
                      SOURCE_COLOR[srcOf(item)],
                    )}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate leading-tight">{item.title}</p>
                  <p className="text-muted truncate text-xs">
                    {item.channel}
                    {item.duration && <span> · {item.duration}</span>}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => copyUrl(item.url)}
                    className="text-muted hover:text-foreground"
                    title={t("mr.copyUrl")}
                  >
                    <Icon name="Copy" size={14} />
                  </button>
                  {isHost && item.id !== currentItemId && (
                    <button
                      onClick={() => onPlay(item.id)}
                      className="text-muted hover:text-foreground"
                      title={t("mr.playNow")}
                    >
                      <Icon name="Play" size={14} />
                    </button>
                  )}
                  {isHost && (
                    <button
                      onClick={() => onRemove(item.id)}
                      className="text-muted hover:text-danger"
                      title={t("mr.remove")}
                    >
                      <Icon name="X" size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

// ── Chat panel ────────────────────────────────────────────────────────────────
function ChatAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />;
  }
  return (
    <span className="from-primary to-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[11px] font-bold text-white">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function fmtTime(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function ChatPanel({
  messages,
  userId,
  presence,
  onSend,
}: {
  messages: MusicChatMessage[];
  userId: string;
  presence: Record<string, RoomPresence>;
  onSend: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = () => {
    if (!text.trim()) return;
    onSend(text);
    setText("");
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <p className="text-muted pt-8 text-center text-sm">{t("mr.chatEmpty")}</p>
        )}
        {messages.map((m, i) => {
          if (m.isSystem) {
            return (
              <p key={m.id} className="text-muted py-0.5 text-center text-xs italic">
                {m.text}
              </p>
            );
          }
          const mine = m.userId === userId;
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const GAP = 3e5; // 5 minutes
          // First/last message in a run of consecutive messages from one author.
          const firstOfGroup =
            !prev || prev.isSystem || prev.userId !== m.userId || m.createdAt - prev.createdAt >= GAP;
          const lastOfGroup =
            !next || next.isSystem || next.userId !== m.userId || next.createdAt - m.createdAt >= GAP;

          // Messenger-style corner rounding: only the group's outer corners on the
          // author's side stay round; inner ones flatten so the run reads as one.
          const corner = mine
            ? cn(firstOfGroup ? "rounded-tr-2xl" : "rounded-tr-md", lastOfGroup ? "rounded-br-2xl" : "rounded-br-md")
            : cn(firstOfGroup ? "rounded-tl-2xl" : "rounded-tl-md", lastOfGroup ? "rounded-bl-2xl" : "rounded-bl-md");

          return (
            <div
              key={m.id}
              className={cn(
                "flex items-end gap-2",
                mine && "flex-row-reverse",
                firstOfGroup ? "mt-2.5" : "mt-0.5",
              )}
            >
              {/* avatar sits with the last bubble of the group (Messenger style) */}
              <div className="w-7 shrink-0">
                {!mine && lastOfGroup && (
                  <ChatAvatar name={m.userName} avatarUrl={presence[m.userId]?.avatarUrl} />
                )}
              </div>
              <div className={cn("flex max-w-[75%] flex-col", mine && "items-end")}>
                {firstOfGroup && !mine && (
                  <span className="text-muted mb-0.5 px-1 text-[11px] font-medium">{m.userName}</span>
                )}
                <div
                  className={cn(
                    "group/msg relative rounded-2xl px-3 py-1.5 text-sm break-words",
                    corner,
                    mine ? "bg-primary text-white" : "bg-surface-2 text-foreground",
                  )}
                >
                  {m.text}
                  {/* hover timestamp, on the side away from the bubble */}
                  <span
                    className={cn(
                      "text-muted pointer-events-none absolute top-1/2 -translate-y-1/2 whitespace-nowrap text-[10px] opacity-0 transition-opacity group-hover/msg:opacity-100",
                      mine ? "right-full mr-2" : "left-full ml-2",
                    )}
                  >
                    {fmtTime(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("mr.chatPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && send()}
          className="flex-1 rounded-full text-sm"
        />
        <Button size="sm" onClick={send} disabled={!text.trim()} className="rounded-full px-3">
          <Icon name="Send" size={16} />
        </Button>
      </div>
    </div>
  );
}

// ── Presence avatars ──────────────────────────────────────────────────────────
function PresenceBar({
  presence,
  hostId,
}: {
  presence: Record<string, RoomPresence>;
  hostId: string | null;
}) {
  const users = Object.entries(presence);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {users.map(([id, u]) => (
        <div key={id} className="flex items-center gap-1 text-xs" title={u.name}>
          {u.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <span className="from-primary to-accent flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white">
              {u.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className="text-muted max-w-[80px] truncate hidden sm:inline">{u.name}</span>
          {id === hostId && <Icon name="Crown" size={11} className="text-warning shrink-0" />}
        </div>
      ))}
    </div>
  );
}

// ── Room view ─────────────────────────────────────────────────────────────────
function RoomView({
  roomCode,
  userId,
  userName,
  avatarUrl,
  onLeave,
}: {
  roomCode: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const ytRef = useRef<YTHandle>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    room,
    queue,
    playerState,
    presence,
    messages,
    isHost,
    addSong,
    addMeta,
    removeSong,
    playSong,
    togglePlay,
    nextSong,
    prevSong,
    sendChat,
    reportProgress,
  } = useFirebaseRoom(roomCode, userId, userName, avatarUrl);

  const [tab, setTab] = useState<"queue" | "chat">("queue");

  const currentItem = queue.find((q) => q.id === playerState.currentItemId) ?? null;
  const isYouTube = currentItem ? srcOf(currentItem) === "youtube" : false;

  // Animate the browser tab title with the now-playing track.
  usePlayingTabTitle(currentItem && playerState.isPlaying ? currentItem.title : null);

  // Host: report progress every 3 s while playing
  useEffect(() => {
    if (!isHost || !playerState.isPlaying) {
      if (progressRef.current) clearInterval(progressRef.current);
      return;
    }
    progressRef.current = setInterval(() => {
      if (ytRef.current) reportProgress(ytRef.current.getCurrentTime());
    }, 3000);
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [isHost, playerState.isPlaying, reportProgress]);

  // Non-host: sync to Firebase playerState
  const prevStateRef = useRef(playerState);
  useEffect(() => {
    if (isHost || !ytRef.current) return;
    const prev = prevStateRef.current;
    prevStateRef.current = playerState;

    const elapsed = playerState.isPlaying ? (Date.now() - playerState.updatedAt) / 1000 : 0;
    const expected = playerState.currentTime + elapsed;
    const actual = ytRef.current.getCurrentTime();
    if (Math.abs(actual - expected) > 2.5) ytRef.current.seek(expected);

    if (playerState.isPlaying !== prev.isPlaying) {
      if (playerState.isPlaying) ytRef.current.play();
      else ytRef.current.pause();
    }
  }, [playerState, isHost]);

  // Host: handle YT state changes
  const handleYTState = useCallback(
    (state: number) => {
      if (!isHost) return;
      const { PLAYING, PAUSED, ENDED } = { PLAYING: 1, PAUSED: 2, ENDED: 0 };
      if (state === PLAYING) togglePlay(true);
      else if (state === PAUSED) togglePlay(false);
      else if (state === ENDED) nextSong();
    },
    [isHost, togglePlay, nextSong],
  );

  // Compute host userId
  const hostId =
    Object.entries(presence).length > 0
      ? Object.entries(presence).reduce((a, b) => (a[1].joinedAt < b[1].joinedAt ? a : b))[0]
      : null;

  const userCount = Object.keys(presence).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{room?.name ?? roomCode}</h2>
          <div className="flex items-center gap-2">
            <span className="text-muted text-xs">
              {userCount} {t("mr.online")}
            </span>
            {isHost && (
              <span className="bg-warning/15 text-warning rounded px-1.5 py-0.5 text-[10px] font-semibold">
                {t("mr.host")}
              </span>
            )}
          </div>
          {/* Host sees the invite code so they can share it (esp. private rooms). */}
          {isHost && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(roomCode);
                  toast(t("mr.codeCopied"), "success");
                } catch {
                  /* clipboard may be unavailable */
                }
              }}
              title={t("mr.copyCode")}
              className="border-border bg-surface-2 hover:bg-surface mt-1 inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 transition-colors"
            >
              <Icon name={room?.visibility === "private" ? "Lock" : "Link"} size={12} className="text-muted" />
              <span className="text-muted text-[10px]">{t("mr.inviteCode")}</span>
              <span className="font-mono text-xs font-semibold tracking-widest">{roomCode}</span>
              <Icon name="Copy" size={12} className="text-muted" />
            </button>
          )}
        </div>
        <PresenceBar presence={presence} hostId={hostId} />
        <Button variant="outline" size="sm" onClick={onLeave}>
          <Icon name="LogOut" size={15} /> {t("mr.leave")}
        </Button>
      </div>

      {/* Player */}
      {currentItem ? (
        <div className="space-y-2">
          {isYouTube ? (
            <YouTubePlayer
              ref={ytRef}
              videoId={currentItem.sourceId}
              onStateChange={handleYTState}
            />
          ) : (
            <EmbedPlayer item={currentItem} />
          )}
          {/* Transport controls (host only) */}
          {isHost && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="ghost" size="sm" onClick={prevSong} disabled={queue.indexOf(currentItem) === 0}>
                <Icon name="SkipBack" size={18} />
              </Button>
              {isYouTube && (
                <Button size="sm" onClick={() => togglePlay(!playerState.isPlaying)} className="w-10">
                  <Icon name={playerState.isPlaying ? "Pause" : "Play"} size={18} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={nextSong}
                disabled={queue.indexOf(currentItem) === queue.length - 1}
              >
                <Icon name="SkipForward" size={18} />
              </Button>
            </div>
          )}
          <p className="text-muted flex items-center justify-center gap-1.5 truncate text-center text-sm">
            <Icon
              name={SOURCE_ICON[srcOf(currentItem)]}
              size={13}
              className={SOURCE_COLOR[srcOf(currentItem)]}
            />
            <span className="truncate">{currentItem.title}</span>
            {currentItem.channel && <span className="text-muted/60 shrink-0"> · {currentItem.channel}</span>}
          </p>
          {!isYouTube && (
            <p className="text-muted/70 text-center text-xs">{t("mr.embedNote")}</p>
          )}
        </div>
      ) : (
        <Card>
          <CardBody className="flex flex-col items-center gap-2 py-12 text-center">
            <Icon name="Music" size={32} className="text-muted" />
            <p className="text-muted text-sm">{t("mr.noQueue")}</p>
          </CardBody>
        </Card>
      )}

      {/* Queue + Chat (desktop: side-by-side; mobile: tabs) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Mobile tabs */}
        <div className="md:hidden flex gap-2">
          <button
            onClick={() => setTab("queue")}
            className={cn(
              "flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors",
              tab === "queue" ? "bg-primary text-white" : "bg-surface-2 text-muted",
            )}
          >
            {t("mr.queue")} ({queue.length})
          </button>
          <button
            onClick={() => setTab("chat")}
            className={cn(
              "flex-1 rounded-xl py-1.5 text-sm font-medium transition-colors",
              tab === "chat" ? "bg-primary text-white" : "bg-surface-2 text-muted",
            )}
          >
            {t("mr.chat")}
          </button>
        </div>

        {/* Queue */}
        <Card className={cn("md:block", tab !== "queue" && "hidden md:block")}>
          <CardBody className="h-80 overflow-hidden">
            <h3 className="mb-2 text-sm font-semibold">
              {t("mr.queue")} <span className="text-muted">({queue.length})</span>
            </h3>
            <div className="h-[calc(100%-1.75rem)]">
              <QueuePanel
                queue={queue}
                currentItemId={playerState.currentItemId}
                isHost={isHost}
                onPlay={playSong}
                onRemove={removeSong}
                onAddUrl={addSong}
                onAddMeta={addMeta}
              />
            </div>
          </CardBody>
        </Card>

        {/* Chat */}
        <Card className={cn("md:block", tab !== "chat" && "hidden md:block")}>
          <CardBody className="h-80 overflow-hidden">
            <h3 className="mb-2 text-sm font-semibold">{t("mr.chat")}</h3>
            <div className="h-[calc(100%-1.75rem)]">
              <ChatPanel
                messages={messages}
                userId={userId}
                presence={presence}
                onSend={sendChat}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ── Room browser (home view) ──────────────────────────────────────────────────
function RoomBrowser({ onEnter }: { onEnter: (code: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rooms, setRooms] = useState<MusicRoom[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newVis, setNewVis] = useState<"public" | "private">("public");
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [lockedRoom, setLockedRoom] = useState<MusicRoom | null>(null);
  const [unlockInput, setUnlockInput] = useState("");
  const db = getRtdb();

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, "musicRooms"), (snap) => {
      const val = (snap.val() ?? {}) as Record<string, { meta?: MusicRoom }>;
      const all = Object.values(val)
        .map((v) => v.meta)
        .filter((m): m is MusicRoom => !!m);
      // Delete rooms idle for >24h and drop them from the list immediately.
      const removed = new Set(pruneStaleRooms(all));
      const list = all
        .filter((m) => !removed.has(m.code))
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 30);
      setRooms(list);
    });
  }, [db]);

  // Private rooms are listed but locked: clicking opens a modal asking for the
  // invite code, which must match the room's code to enter.
  const handleRoomClick = (r: MusicRoom) => {
    if (r.visibility === "private") {
      setLockedRoom(r);
      setUnlockInput("");
    } else {
      onEnter(r.code);
    }
  };

  const submitUnlock = () => {
    if (!lockedRoom) return;
    if (unlockInput.trim().toUpperCase() === lockedRoom.code) onEnter(lockedRoom.code);
    else toast(t("mr.wrongCode"), "error");
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const code = await createRoom(newName, newVis);
      setNewName("");
      onEnter(code);
    } catch {
      toast(t("mr.noDb"), "error");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setJoining(true);
    try {
      const exists = await checkRoomExists(code);
      if (!exists) {
        toast(t("mr.notFound"), "error");
        return;
      }
      onEnter(code);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Create + Join */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-semibold">{t("mr.createRoom")}</h3>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("mr.roomName")}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setNewVis("public")}
                className={cn(
                  "flex-1 rounded-xl border py-1.5 text-sm transition-colors",
                  newVis === "public"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted",
                )}
              >
                {t("mr.public")}
              </button>
              <button
                onClick={() => setNewVis("private")}
                className={cn(
                  "flex-1 rounded-xl border py-1.5 text-sm transition-colors",
                  newVis === "private"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted",
                )}
              >
                {t("mr.private")}
              </button>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Plus" size={16} />
              )}{" "}
              {t("mr.createRoom")}
            </Button>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-semibold">{t("mr.joinByCode")}</h3>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t("mr.code")}
              maxLength={6}
              className="tracking-widest font-mono uppercase"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button className="w-full" onClick={handleJoin} disabled={joining || !joinCode.trim()}>
              {joining ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="DoorOpen" size={16} />
              )}{" "}
              {t("mr.enter")}
            </Button>
          </CardBody>
        </Card>
      </div>

      {/* Rooms */}
      <div>
        <h3 className="mb-3 font-semibold">{t("mr.rooms")}</h3>
        {rooms.length === 0 ? (
          <p className="text-muted text-sm">{t("mr.noRooms")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rooms.map((r) => {
              const isPrivate = r.visibility === "private";
              return (
                <button
                  key={r.code}
                  onClick={() => handleRoomClick(r)}
                  className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-xl border p-3 text-left transition-colors"
                >
                  <Icon
                    name={isPrivate ? "Lock" : "Music"}
                    size={20}
                    className={cn("shrink-0", isPrivate ? "text-warning" : "text-primary")}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.name}</p>
                    <p className="text-muted text-xs">
                      {isPrivate ? (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="Lock" size={11} /> {t("mr.private")}
                        </span>
                      ) : (
                        <span className="font-mono">{r.code}</span>
                      )}
                    </p>
                  </div>
                  <Icon name="ChevronRight" size={16} className="text-muted shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Private-room code entry */}
      <Modal
        open={!!lockedRoom}
        onClose={() => setLockedRoom(null)}
        title={
          <span className="flex items-center gap-2">
            <Icon name="Lock" size={16} className="text-warning" /> {lockedRoom?.name}
          </span>
        }
      >
        <div className="space-y-4">
          <p className="text-muted text-sm">{t("mr.privatePrompt")}</p>
          <Input
            autoFocus
            value={unlockInput}
            onChange={(e) => setUnlockInput(e.target.value.toUpperCase())}
            placeholder={t("mr.enterCodeToJoin")}
            maxLength={6}
            className="tracking-[0.4em] text-center font-mono text-lg uppercase"
            onKeyDown={(e) => e.key === "Enter" && submitUnlock()}
          />
          <Button className="w-full" onClick={submitUnlock} disabled={!unlockInput.trim()}>
            <Icon name="DoorOpen" size={16} /> {t("mr.enter")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ── Top-level page ────────────────────────────────────────────────────────────
export default function MusicRoomPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const guestId = useGuestId();
  const [guestName, setGuestName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [activeCode, setActiveCode] = useState<string | null>(null);

  const userId = authUser?.id ?? guestId;
  const userName = authUser?.name ?? guestName;
  const avatarUrl = authUser?.avatarUrl;

  if (!realtimeEnabled) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <Icon name="Wifi" size={32} className="text-muted" />
          <p className="font-medium">{t("mr.noDb")}</p>
          <p className="text-muted text-sm max-w-xs">{t("lb.unavailable")}</p>
        </CardBody>
      </Card>
    );
  }

  // If no name yet, show prompt before entering a room
  if (!userName && pendingCode !== null) {
    return (
      <Card className="mx-auto max-w-sm">
        <CardBody className="space-y-4">
          <div className="text-center">
            <Icon name="Music" size={32} className="text-primary mx-auto mb-2" />
            <h2 className="font-bold text-lg">{t("mr.yourName")}</h2>
          </div>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder={t("mr.yourName")}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && nameInput.trim()) {
                setGuestName(nameInput.trim());
                setActiveCode(pendingCode);
                setPendingCode(null);
              }
            }}
          />
          <Button
            className="w-full"
            disabled={!nameInput.trim()}
            onClick={() => {
              setGuestName(nameInput.trim());
              setActiveCode(pendingCode);
              setPendingCode(null);
            }}
          >
            {t("mr.continue")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  const handleEnter = (code: string) => {
    if (!userName) {
      setPendingCode(code);
      return;
    }
    setActiveCode(code);
  };

  if (activeCode) {
    return (
      <RoomView
        roomCode={activeCode}
        userId={userId}
        userName={userName}
        avatarUrl={avatarUrl}
        onLeave={() => setActiveCode(null)}
      />
    );
  }

  return <RoomBrowser onEnter={handleEnter} />;
}
