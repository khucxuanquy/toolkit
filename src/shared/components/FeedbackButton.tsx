"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Modal, Button, Icon, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useAuthStore } from "@/core/auth/auth-store";
import { realtimeEnabled } from "@/core/firebase/config";
import { submitFeedback, type FeedbackCategory } from "@/core/admin/admin";
import { cn } from "@/shared/utils/cn";

const CATEGORIES: { value: FeedbackCategory; icon: string }[] = [
  { value: "idea", icon: "Sparkles" },
  { value: "bug", icon: "Bomb" },
  { value: "praise", icon: "Star" },
  { value: "other", icon: "Mail" },
];

/** Global floating "send feedback" button, available on every page. */
export function FeedbackButton() {
  const { t } = useTranslation();
  const toast = useToast();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>("idea");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!realtimeEnabled) return null;

  const send = async () => {
    if (!text.trim()) return;
    setSending(true);
    try {
      await submitFeedback({ text, category, user, page: pathname });
      toast(t("feedback.sent"), "success");
      setText("");
      setCategory("idea");
      setOpen(false);
    } catch {
      toast(t("feedback.error"), "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("feedback.button")}
        title={t("feedback.button")}
        className="from-primary to-accent fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        <Icon name="MessageSquare" size={20} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title={t("feedback.title")} className="max-w-md">
        <div className="space-y-4">
          <p className="text-muted text-sm">{t("feedback.subtitle")}</p>

          {/* Category */}
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2 text-xs font-medium transition-colors",
                  category === c.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted hover:bg-surface-2",
                )}
              >
                <Icon name={c.icon} size={18} />
                {t(`feedback.cat.${c.value}`)}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("feedback.placeholder")}
            rows={4}
            maxLength={2000}
            autoFocus
            className="border-border bg-surface focus-visible:border-primary w-full resize-y rounded-xl border p-3 text-sm outline-none"
          />

          {!user && <p className="text-muted text-xs">{t("feedback.anonNote")}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={sending}
            >
              {t("profile.cancel")}
            </Button>
            <Button className="flex-1" onClick={send} disabled={sending || !text.trim()}>
              {sending ? (
                <Icon name="Loader2" size={16} className="animate-spin" />
              ) : (
                <Icon name="Send" size={16} />
              )}{" "}
              {t("feedback.send")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
