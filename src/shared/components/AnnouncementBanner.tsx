"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";
import { realtimeEnabled } from "@/core/firebase/config";
import { watchAnnouncement, type Announcement } from "@/core/admin/admin";

const STYLES: Record<Announcement["type"], string> = {
  info: "bg-primary/10 text-primary border-primary/30",
  warning: "bg-warning/10 text-warning border-warning/30",
  success: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
};

/** App-wide banner for the admin's current announcement. Dismissible per session. */
export function AnnouncementBanner() {
  const [a, setA] = useState<Announcement | null>(null);
  // Remember which announcement (by timestamp) was dismissed, so a new one shows.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!realtimeEnabled) return;
    return watchAnnouncement(setA);
  }, []);

  if (!a || !a.active || !a.text.trim() || dismissedAt === a.updatedAt) return null;

  return (
    <div className={cn("border-b px-4 py-2 text-center text-sm font-medium", STYLES[a.type])}>
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2">
        <Icon name="Megaphone" size={15} className="shrink-0" />
        <span className="flex-1">{a.text}</span>
        <button
          onClick={() => setDismissedAt(a.updatedAt)}
          aria-label="Dismiss"
          className="shrink-0 opacity-70 hover:opacity-100"
        >
          <Icon name="X" size={15} />
        </button>
      </div>
    </div>
  );
}
