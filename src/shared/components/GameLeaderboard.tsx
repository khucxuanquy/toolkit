"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { realtimeEnabled } from "@/core/firebase/config";
import { useAuthStore } from "@/core/auth/auth-store";
import { watchLeaderboard, type ScoreEntry } from "@/core/firebase/realtime";

/**
 * Compact global high-score panel embedded inside a game. Renders nothing when
 * Realtime DB isn't configured. Invites signed-out players to sign in (optional)
 * so their score can be ranked.
 */
export function GameLeaderboard({ game, max = 5 }: { game: string; max?: number }) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [scores, setScores] = useState<ScoreEntry[]>([]);

  useEffect(() => {
    if (!realtimeEnabled) return;
    return watchLeaderboard(game, max, setScores);
  }, [game, max]);

  if (!realtimeEnabled) return null;

  return (
    <div className="border-border bg-surface space-y-2 rounded-2xl border p-4">
      <div className="flex items-center gap-2">
        <Icon name="Trophy" size={16} className="text-warning" />
        <h3 className="text-sm font-semibold">{t("lb.topScores")}</h3>
      </div>

      {scores.length === 0 ? (
        <p className="text-muted text-sm">{t("lb.noScores")}</p>
      ) : (
        <ol className="space-y-1">
          {scores.map((s, i) => (
            <li
              key={s.id}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1 text-sm",
                s.id === user?.id && "bg-primary/10",
              )}
            >
              <span className="flex w-5 justify-center">
                {i === 0 ? (
                  <Icon name="Crown" size={14} className="text-warning" />
                ) : (
                  <span className="text-muted font-bold tabular-nums">{i + 1}</span>
                )}
              </span>
              <span className="flex-1 truncate">{s.name}</span>
              <span className="font-bold tabular-nums">{s.score}</span>
            </li>
          ))}
        </ol>
      )}

      {!user && (
        <Link href="/login" className="text-primary block text-center text-xs hover:underline">
          {t("lb.signInHint")}
        </Link>
      )}
    </div>
  );
}
