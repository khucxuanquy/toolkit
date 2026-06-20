"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Card, CardBody, Icon, Input, Tabs, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useAuthStore } from "@/core/auth/auth-store";
import { useIsAdmin } from "@/core/admin/useIsAdmin";
import { realtimeEnabled } from "@/core/firebase/config";
import { watchOnline, type OnlineUser } from "@/core/firebase/realtime";
import {
  cancelInvite,
  deleteFeedback,
  inviteAdmin,
  removeAdmin,
  saveAnnouncement,
  setFeedbackStatus,
  watchAdmins,
  watchAnnouncement,
  watchFeedback,
  watchInvites,
  type AdminEntry,
  type AdminInvite,
  type Announcement,
  type Feedback,
  type FeedbackCategory,
} from "@/core/admin/admin";
import { cn } from "@/shared/utils/cn";

type Tab = "overview" | "feedback" | "users" | "announce";

const CAT_ICON: Record<FeedbackCategory, string> = {
  idea: "Sparkles",
  bug: "Bomb",
  praise: "Star",
  other: "Mail",
};
const CAT_COLOR: Record<FeedbackCategory, string> = {
  idea: "text-primary",
  bug: "text-danger",
  praise: "text-warning",
  other: "text-muted",
};

function relTime(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(ms).toLocaleDateString();
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin, isSuper, ready } = useIsAdmin();
  const hydrated = useAuthStore((s) => s.hydrated);
  const [tab, setTab] = useState<Tab>("overview");

  if (!realtimeEnabled) {
    return <Gate icon="Wifi" title={t("mr.noDb")} />;
  }
  if (!hydrated || !ready) {
    return (
      <div className="flex justify-center py-24">
        <Icon name="Loader2" size={28} className="text-muted animate-spin" />
      </div>
    );
  }
  if (!isAdmin) {
    return <Gate icon="Shield" title={t("admin.denied")} message={t("admin.deniedMsg")} home />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="from-primary to-accent flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white">
          <Icon name="Shield" size={20} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("admin.title")}</h1>
          <p className="text-muted text-sm">{t("admin.subtitle")}</p>
        </div>
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: t("admin.tab.overview") },
          { value: "feedback", label: t("admin.tab.feedback") },
          { value: "users", label: t("admin.tab.users") },
          { value: "announce", label: t("admin.tab.announce") },
        ]}
      />

      {tab === "overview" && <Overview />}
      {tab === "feedback" && <FeedbackPanel />}
      {tab === "users" && <UsersPanel isSuper={isSuper} />}
      {tab === "announce" && <AnnouncePanel />}
    </div>
  );
}

function Gate({
  icon,
  title,
  message,
  home,
}: {
  icon: string;
  title: string;
  message?: string;
  home?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Card className="mx-auto max-w-md">
      <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
        <Icon name={icon} size={32} className="text-muted" />
        <h1 className="text-lg font-semibold">{title}</h1>
        {message && <p className="text-muted text-sm">{message}</p>}
        {home && (
          <Link
            href="/"
            className="text-primary mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
          >
            <Icon name="Home" size={16} /> {t("host.back")}
          </Link>
        )}
      </CardBody>
    </Card>
  );
}

/* ------------------------------- Overview ------------------------------- */
function Overview() {
  const { t } = useTranslation();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [online, setOnline] = useState<OnlineUser[]>([]);

  useEffect(() => watchFeedback(setFeedback), []);
  useEffect(() => watchAdmins(setAdmins), []);
  useEffect(() => watchOnline(setOnline), []);

  const newCount = feedback.filter((f) => f.status === "new").length;
  const byCat = useMemo(() => {
    const m: Record<string, number> = {};
    for (const f of feedback) m[f.category] = (m[f.category] ?? 0) + 1;
    return m;
  }, [feedback]);

  const stats = [
    { icon: "MessageSquare", label: t("admin.stat.feedback"), value: feedback.length, color: "text-primary" },
    { icon: "Inbox", label: t("admin.stat.new"), value: newCount, color: "text-warning" },
    { icon: "Users", label: t("admin.stat.online"), value: online.length, color: "text-green-500" },
    { icon: "Shield", label: t("admin.stat.admins"), value: admins.length, color: "text-accent" },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3 py-4">
              <span className="bg-surface-2 flex h-10 w-10 items-center justify-center rounded-xl">
                <Icon name={s.icon} size={18} className={s.color} />
              </span>
              <div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-muted text-xs">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {/* Category breakdown */}
        <Card>
          <CardBody className="space-y-3">
            <h3 className="text-sm font-semibold">{t("admin.byCategory")}</h3>
            {feedback.length === 0 ? (
              <p className="text-muted text-sm">{t("admin.noFeedback")}</p>
            ) : (
              (["idea", "bug", "praise", "other"] as FeedbackCategory[]).map((c) => {
                const n = byCat[c] ?? 0;
                const pct = feedback.length ? Math.round((n / feedback.length) * 100) : 0;
                return (
                  <div key={c} className="flex items-center gap-2 text-sm">
                    <Icon name={CAT_ICON[c]} size={15} className={cn("shrink-0", CAT_COLOR[c])} />
                    <span className="w-16 shrink-0">{t(`feedback.cat.${c}`)}</span>
                    <div className="bg-surface-2 h-2 flex-1 overflow-hidden rounded-full">
                      <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-muted w-8 shrink-0 text-right tabular-nums">{n}</span>
                  </div>
                );
              })
            )}
          </CardBody>
        </Card>

        {/* Online now */}
        <Card>
          <CardBody className="space-y-2">
            <h3 className="text-sm font-semibold">
              {t("admin.stat.online")} <span className="text-muted">({online.length})</span>
            </h3>
            {online.length === 0 ? (
              <p className="text-muted text-sm">{t("admin.nobodyOnline")}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {online.map((u) => (
                  <span
                    key={u.id}
                    className="bg-surface-2 flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs"
                  >
                    {u.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatarUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <span className="from-primary to-accent flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {u.name}
                  </span>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------- Feedback ------------------------------- */
function FeedbackPanel() {
  const { t } = useTranslation();
  const [list, setList] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<"all" | "new" | "resolved">("all");

  useEffect(() => watchFeedback(setList), []);

  const shown = list.filter((f) => filter === "all" || f.status === filter);

  return (
    <div className="space-y-3">
      <Tabs<"all" | "new" | "resolved">
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: `${t("admin.filter.all")} (${list.length})` },
          { value: "new", label: `${t("admin.filter.new")} (${list.filter((f) => f.status === "new").length})` },
          { value: "resolved", label: t("admin.filter.resolved") },
        ]}
      />

      {shown.length === 0 ? (
        <Card>
          <CardBody className="text-muted py-12 text-center text-sm">{t("admin.noFeedback")}</CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {shown.map((f) => (
            <Card key={f.id}>
              <CardBody className="flex gap-3 py-3">
                <Icon
                  name={CAT_ICON[f.category]}
                  size={18}
                  className={cn("mt-0.5 shrink-0", CAT_COLOR[f.category])}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words whitespace-pre-wrap">{f.text}</p>
                  <p className="text-muted mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                    <span className="font-medium">{f.userName}</span>
                    {f.userEmail && <span>· {f.userEmail}</span>}
                    <span>· {f.page}</span>
                    <span>· {relTime(f.createdAt)}</span>
                    {f.status === "resolved" && (
                      <span className="text-green-500">· {t("admin.filter.resolved")}</span>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-1">
                  <button
                    onClick={() => setFeedbackStatus(f.id, f.status === "new" ? "resolved" : "new")}
                    title={f.status === "new" ? t("admin.markResolved") : t("admin.reopen")}
                    className={cn(
                      "hover:bg-surface-2 rounded-lg p-1.5",
                      f.status === "resolved" ? "text-muted" : "text-green-500",
                    )}
                  >
                    <Icon name={f.status === "new" ? "Check" : "RotateCcw"} size={16} />
                  </button>
                  <button
                    onClick={() => deleteFeedback(f.id)}
                    title={t("admin.delete")}
                    className="text-muted hover:text-danger hover:bg-surface-2 rounded-lg p-1.5"
                  >
                    <Icon name="Trash2" size={16} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------------------- Users --------------------------------- */
function UsersPanel({ isSuper }: { isSuper: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [admins, setAdmins] = useState<AdminEntry[]>([]);
  const [invites, setInvites] = useState<AdminInvite[]>([]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => watchAdmins(setAdmins), []);
  useEffect(() => watchInvites(setInvites), []);

  // Hide invites already promoted to an active admin (cleanup is best-effort).
  const adminEmails = new Set(admins.map((a) => a.email.toLowerCase()));
  const pending = invites.filter((i) => !adminEmails.has(i.email.toLowerCase()));

  const invite = async () => {
    setBusy(true);
    try {
      await inviteAdmin(email, user?.email ?? "super");
      toast(t("admin.invited"), "success");
      setEmail("");
    } catch (e) {
      const key = e instanceof Error && e.message.startsWith("admin.err.") ? e.message : "admin.err.email";
      toast(t(key), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <h3 className="text-sm font-semibold">{t("admin.addUser")}</h3>
          <p className="text-muted text-xs">{t("admin.addUserHint")}</p>
          <div className="flex gap-2">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              onKeyDown={(e) => e.key === "Enter" && email.trim() && invite()}
              className="flex-1"
            />
            <Button onClick={invite} disabled={busy || !email.trim()}>
              {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="UserPlus" size={16} />}
              <span className="hidden sm:inline"> {t("admin.invite")}</span>
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Active admins */}
      <Card>
        <CardBody className="space-y-2">
          <h3 className="text-sm font-semibold">
            {t("admin.activeAdmins")} <span className="text-muted">({admins.length})</span>
          </h3>
          {admins.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-sm">
              <span className="from-primary to-accent flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white">
                {a.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.name}</p>
                <p className="text-muted truncate text-xs">{a.email}</p>
              </div>
              {a.role === "super" ? (
                <span className="bg-warning/15 text-warning flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold">
                  <Icon name="Crown" size={11} /> {t("admin.super")}
                </span>
              ) : (
                isSuper && (
                  <button
                    onClick={() => removeAdmin(a.id)}
                    title={t("admin.remove")}
                    className="text-muted hover:text-danger shrink-0 rounded-lg p-1.5"
                  >
                    <Icon name="Trash2" size={15} />
                  </button>
                )
              )}
            </div>
          ))}
        </CardBody>
      </Card>

      {/* Pending invites */}
      {pending.length > 0 && (
        <Card>
          <CardBody className="space-y-2">
            <h3 className="text-sm font-semibold">
              {t("admin.pending")} <span className="text-muted">({pending.length})</span>
            </h3>
            {pending.map((i) => (
              <div key={i.id} className="flex items-center gap-2 rounded-xl px-1 py-1.5 text-sm">
                <span className="bg-surface-2 text-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                  <Icon name="Mail" size={15} />
                </span>
                <p className="min-w-0 flex-1 truncate">{i.email}</p>
                <span className="text-muted text-xs">{t("admin.awaiting")}</span>
                <button
                  onClick={() => cancelInvite(i.id)}
                  title={t("admin.cancel")}
                  className="text-muted hover:text-danger shrink-0 rounded-lg p-1.5"
                >
                  <Icon name="X" size={15} />
                </button>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------- Announcement ----------------------------- */
function AnnouncePanel() {
  const { t } = useTranslation();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState("");
  const [type, setType] = useState<Announcement["type"]>("info");
  const [active, setActive] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(
    () =>
      watchAnnouncement((a) => {
        if (!loaded) {
          if (a) {
            setText(a.text);
            setType(a.type);
            setActive(a.active);
          }
          setLoaded(true);
        }
      }),
    [loaded],
  );

  const save = async () => {
    setBusy(true);
    try {
      await saveAnnouncement({ text: text.trim(), type, active, by: user?.email ?? "" });
      toast(t("admin.saved"), "success");
    } catch {
      toast(t("feedback.error"), "error");
    } finally {
      setBusy(false);
    }
  };

  const TYPES: Announcement["type"][] = ["info", "warning", "success"];

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">{t("admin.announceTitle")}</h3>
          <p className="text-muted text-xs">{t("admin.announceHint")}</p>
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("admin.announcePlaceholder")}
          rows={2}
          maxLength={200}
          className="border-border bg-surface focus-visible:border-primary w-full resize-y rounded-xl border p-3 text-sm outline-none"
        />

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
            {TYPES.map((ty) => (
              <button
                key={ty}
                onClick={() => setType(ty)}
                className={cn(
                  "rounded-lg border px-3 py-1 text-xs font-medium capitalize transition-colors",
                  type === ty ? "border-primary bg-primary/10 text-primary" : "border-border text-muted",
                )}
              >
                {t(`admin.type.${ty}`)}
              </button>
            ))}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            {t("admin.showBanner")}
          </label>
        </div>

        <Button onClick={save} disabled={busy}>
          {busy ? <Icon name="Loader2" size={16} className="animate-spin" /> : <Icon name="Megaphone" size={16} />}{" "}
          {t("admin.saveAnnounce")}
        </Button>
      </CardBody>
    </Card>
  );
}
