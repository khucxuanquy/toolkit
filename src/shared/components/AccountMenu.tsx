"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/core/auth/auth-store";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useIsAdmin } from "@/core/admin/useIsAdmin";
import { Icon, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";
import { ProfileDialog } from "./ProfileDialog";

function initial(user: { name?: string; email: string }): string {
  const base = user.name?.trim() || user.email;
  return base.charAt(0).toUpperCase();
}

/** Avatar image when set, otherwise the initial on a gradient. */
function Avatar({
  user,
  className,
}: {
  user: { name?: string; email: string; avatarUrl?: string };
  className?: string;
}) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className={cn("object-cover", className)} />;
  }
  return (
    <span
      className={cn(
        "from-primary to-accent flex items-center justify-center bg-gradient-to-br font-bold text-white",
        className,
      )}
    >
      {initial(user)}
    </span>
  );
}

export function AccountMenu() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const signOut = useAuthStore((s) => s.signOut);
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Until the session is read, show the signed-out control (matches SSR).
  if (!hydrated || !user) {
    return (
      <Link
        href="/login"
        aria-label={t("auth.signIn")}
        className="border-border bg-surface text-foreground hover:bg-surface-2 flex h-10 shrink-0 items-center gap-2 rounded-xl border px-2.5 text-sm font-medium transition-colors"
      >
        <Icon name="LogIn" size={18} />
        <span className="hidden sm:inline">{t("auth.signIn")}</span>
      </Link>
    );
  }

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    toast(t("auth.signedOut"), "info");
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("auth.account")}
        className="block h-10 w-10 overflow-hidden rounded-xl shadow-sm"
      >
        <Avatar user={user} className="h-10 w-10 rounded-xl text-sm" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="border-border bg-surface absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border p-1 shadow-lg"
          >
            <div className="flex items-center gap-2.5 px-3 py-2">
              <Avatar user={user} className="h-9 w-9 shrink-0 rounded-lg text-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="text-muted truncate text-xs">{user.email}</p>
              </div>
            </div>
            <div className="bg-border my-1 h-px" />
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="text-primary hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium"
              >
                <Icon name="Shield" size={16} /> {t("admin.title")}
              </Link>
            )}
            <button
              onClick={() => {
                setOpen(false);
                setEditing(true);
              }}
              className="hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
            >
              <Icon name="User" size={16} /> {t("profile.edit")}
            </button>
            <button
              onClick={handleSignOut}
              className={cn(
                "text-danger hover:bg-surface-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm",
              )}
            >
              <Icon name="LogOut" size={16} /> {t("auth.signOut")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {editing && <ProfileDialog onClose={() => setEditing(false)} />}
    </div>
  );
}
