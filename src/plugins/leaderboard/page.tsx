"use client";

import { useEffect, useState } from "react";
import { Card, CardBody, Tabs, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { realtimeEnabled } from "@/core/firebase/config";
import { useAuthStore } from "@/core/auth/auth-store";
import {
  watchOnline,
  watchLeaderboard,
  type OnlineUser,
  type ScoreEntry,
} from "@/core/firebase/realtime";

const GAMES = ["flappy-bird", "tower", "2048"] as const;
type Game = (typeof GAMES)[number];

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const [game, setGame] = useState<Game>("flappy-bird");
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    if (!realtimeEnabled) return;
    return watchOnline(setOnline);
  }, []);

  useEffect(() => {
    if (!realtimeEnabled) return;
    return watchLeaderboard(game, 20, setScores);
  }, [game]);

  if (!realtimeEnabled) {
    return (
      <Card className="mx-auto max-w-md">
        <CardBody className="space-y-2 py-10 text-center">
          <Icon name="Trophy" size={32} className="text-muted mx-auto" />
          <p className="text-muted text-sm">{t("lb.unavailable")}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Online now */}
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
              <span className="bg-success relative inline-flex h-2.5 w-2.5 rounded-full" />
            </span>
            <h3 className="font-semibold">
              {t("lb.online")} <span className="text-muted tabular-nums">({online.length})</span>
            </h3>
          </div>
          {online.length === 0 ? (
            <p className="text-muted text-sm">{t("lb.noOnline")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {online.map((u) => (
                <span
                  key={u.id}
                  className="bg-surface-2 flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm"
                >
                  <Avatar name={u.name} url={u.avatarUrl} />
                  {u.name}
                </span>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* High scores */}
      <Card>
        <CardBody className="space-y-3">
          <h3 className="font-semibold">{t("lb.topScores")}</h3>
          <div className="flex justify-center">
            <Tabs<Game>
              items={GAMES.map((g) => ({ value: g, label: t(`plugins.${g}.name`) }))}
              value={game}
              onChange={(g) => {
                setScores([]);
                setGame(g);
              }}
            />
          </div>

          {scores.length === 0 ? (
            <p className="text-muted py-6 text-center text-sm">{t("lb.noScores")}</p>
          ) : (
            <ol className="space-y-1.5">
              {scores.map((s, i) => (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                    s.id === user?.id ? "border-primary bg-primary/10" : "border-border bg-surface",
                  )}
                >
                  <span className="flex w-6 justify-center">
                    {i === 0 ? (
                      <Icon name="Crown" size={16} className="text-warning" />
                    ) : (
                      <span className="text-muted font-bold tabular-nums">{i + 1}</span>
                    )}
                  </span>
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  <span className="font-bold tabular-nums">{s.score}</span>
                </li>
              ))}
            </ol>
          )}

          {!user && <p className="text-muted text-center text-xs">{t("lb.signInHint")}</p>}
        </CardBody>
      </Card>
    </div>
  );
}

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-6 w-6 rounded-full object-cover" />;
  }
  return (
    <span className="from-primary to-accent flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
