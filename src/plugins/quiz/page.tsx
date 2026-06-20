"use client";

import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";
import { Button, Card, CardBody, Icon, Input, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/core/auth/auth-store";
import { LoginRequired } from "@/shared/components/LoginRequired";
import { realtimeEnabled } from "@/core/firebase/config";
import { getRtdb } from "@/core/firebase/app";
import { createQuizRoom, quizRoomExists, useQuizRoom } from "./useQuizRoom";
import { PACKS, packQuestions } from "./questions";
import type { QuizRoomMeta } from "./types";

const OPT_COLOR = ["bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-emerald-500"];
const OPT_SHAPE = ["▲", "◆", "●", "■"];

function Room({
  code,
  userId,
  userName,
  avatarUrl,
  onLeave,
}: {
  code: string;
  userId: string;
  userName: string;
  avatarUrl?: string | null;
  onLeave: () => void;
}) {
  const { t, locale } = useTranslation();
  const room = useQuizRoom(code, userId, userName, avatarUrl);
  const { state, ordered, questions, answers, myAnswer, isHost } = room;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const q = questions[state.qIndex];
  const remain = Math.max(0, Math.ceil((state.questionEndsAt - now) / 1000));
  const answeredCount = Object.keys(answers[state.qIndex] ?? {}).length;
  const ranked = [...ordered].sort((a, b) => b[1].score - a[1].score);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{t("qz.title")}</h2>
          <p className="text-muted text-xs">
            {ordered.length} {t("mr.online")}
            {state.phase === "question" && ` · ${t("qz.qOf", { i: state.qIndex + 1, n: state.total })}`}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onLeave}>
          <Icon name="LogOut" size={15} /> {t("mr.leave")}
        </Button>
      </div>

      {/* Lobby */}
      {state.phase === "lobby" && (
        <div className="space-y-4">
          {isHost ? (
            <Card>
              <CardBody className="space-y-3">
                <h3 className="text-sm font-semibold">{t("qz.pickPack")}</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PACKS.map((p) => (
                    <Button
                      key={p.id}
                      variant="outline"
                      onClick={() => room.setQuestions(packQuestions(p, locale))}
                      className="justify-start"
                    >
                      <Icon name="Brain" size={16} /> {p.name[locale] ?? p.name.en}
                    </Button>
                  ))}
                </div>
                {questions.length > 0 && (
                  <p className="text-muted text-xs">{t("qz.loaded", { n: questions.length })}</p>
                )}
                <Button className="w-full" onClick={room.startGame} disabled={questions.length === 0 || ordered.length < 1}>
                  <Icon name="Play" size={16} /> {t("dg.start")}
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody className="py-10 text-center">
                <Icon name="Loader2" size={24} className="text-muted mx-auto mb-2 animate-spin" />
                <p className="text-muted text-sm">{t("qz.waitHost")}</p>
              </CardBody>
            </Card>
          )}
          <PlayerChips ordered={ordered} showScore={false} />
        </div>
      )}

      {/* Question */}
      {state.phase === "question" && q && (
        <div className="space-y-4">
          <div className="bg-surface-2 h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full transition-[width] duration-300"
              style={{ width: `${(remain / (room.QUESTION_MS / 1000)) * 100}%` }}
            />
          </div>
          <Card>
            <CardBody className="flex items-center justify-between gap-3 py-4">
              <p className="text-lg font-semibold">{q.q}</p>
              <span className="text-primary shrink-0 text-2xl font-bold tabular-nums">{remain}</span>
            </CardBody>
          </Card>

          {myAnswer ? (
            <Card>
              <CardBody className="py-8 text-center">
                <Icon name="Check" size={28} className="mx-auto mb-2 text-green-500" />
                <p className="text-sm">{t("qz.answered")}</p>
                <p className="text-muted text-xs">{t("qz.answeredCount", { a: answeredCount, n: ordered.length })}</p>
              </CardBody>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => room.answer(i)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-4 text-left font-medium text-white transition-transform hover:scale-[1.02] active:scale-95",
                    OPT_COLOR[i],
                  )}
                >
                  <span className="text-lg">{OPT_SHAPE[i]}</span>
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Reveal */}
      {state.phase === "reveal" && q && (
        <div className="space-y-4">
          <Card>
            <CardBody className="py-4">
              <p className="mb-3 text-lg font-semibold">{q.q}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {q.options.map((opt, i) => {
                  const correct = i === q.correct;
                  const mine = myAnswer?.choice === i;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium",
                        correct
                          ? "bg-green-500 text-white"
                          : mine
                            ? "bg-danger/80 text-white"
                            : "bg-surface-2 text-muted",
                      )}
                    >
                      <span>{OPT_SHAPE[i]}</span>
                      {opt}
                      {correct && <Icon name="Check" size={16} className="ml-auto" />}
                      {mine && !correct && <Icon name="X" size={16} className="ml-auto" />}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
          <PlayerChips ordered={ranked} showScore />
        </div>
      )}

      {/* Ended */}
      {state.phase === "ended" && (
        <Card>
          <CardBody className="space-y-4 py-8 text-center">
            <Icon name="Trophy" size={40} className="text-warning mx-auto" />
            <h3 className="text-lg font-bold">{t("dg.gameOver")}</h3>
            <div className="mx-auto max-w-xs space-y-1.5">
              {ranked.map(([id, p], i) => (
                <div
                  key={id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm",
                    i === 0 ? "bg-warning/15" : "bg-surface-2",
                  )}
                >
                  <span className="w-6 text-center font-bold">{["🥇", "🥈", "🥉"][i] ?? i + 1}</span>
                  <span className="flex-1 truncate text-left">{p.name}</span>
                  <span className="font-bold tabular-nums">{p.score}</span>
                </div>
              ))}
            </div>
            {isHost && (
              <Button onClick={room.playAgain}>
                <Icon name="RotateCcw" size={16} /> {t("dg.playAgain")}
              </Button>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function PlayerChips({
  ordered,
  showScore,
}: {
  ordered: [string, { name: string; score: number }][];
  showScore: boolean;
}) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {ordered.map(([id, p]) => (
        <span key={id} className="bg-surface-2 flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs">
          <span className="from-primary to-accent flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white">
            {p.name.charAt(0).toUpperCase()}
          </span>
          {p.name}
          {showScore && <span className="font-bold tabular-nums">{p.score}</span>}
        </span>
      ))}
    </div>
  );
}

function Browser({ onEnter }: { onEnter: (code: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rooms, setRooms] = useState<QuizRoomMeta[]>([]);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const db = getRtdb();

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, "quizRooms"), (snap) => {
      const val = (snap.val() ?? {}) as Record<string, { meta?: QuizRoomMeta }>;
      setRooms(
        Object.values(val)
          .map((v) => v.meta)
          .filter((m): m is QuizRoomMeta => !!m)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 12),
      );
    });
  }, [db]);

  const create = async () => {
    setBusy(true);
    try {
      onEnter(await createQuizRoom(name));
    } catch {
      toast(t("mr.noDb"), "error");
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    if (await quizRoomExists(c)) onEnter(c);
    else toast(t("mr.notFound"), "error");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-semibold">{t("qz.createRoom")}</h3>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mr.roomName")} onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button className="w-full" onClick={create} disabled={busy}>
              <Icon name="Plus" size={16} /> {t("qz.createRoom")}
            </Button>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-semibold">{t("mr.joinByCode")}</h3>
            <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder={t("mr.code")} maxLength={5} className="font-mono uppercase tracking-widest" onKeyDown={(e) => e.key === "Enter" && join()} />
            <Button className="w-full" onClick={join} disabled={!joinCode.trim()}>
              <Icon name="DoorOpen" size={16} /> {t("mr.enter")}
            </Button>
          </CardBody>
        </Card>
      </div>
      <div>
        <h3 className="mb-3 font-semibold">{t("dg.openRooms")}</h3>
        {rooms.length === 0 ? (
          <p className="text-muted text-sm">{t("mr.noRooms")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {rooms.map((r) => (
              <button key={r.code} onClick={() => onEnter(r.code)} className="border-border bg-surface hover:bg-surface-2 flex items-center gap-3 rounded-xl border p-3 text-left transition-colors">
                <Icon name="Brain" size={20} className="text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-muted font-mono text-xs">{r.code}</p>
                </div>
                <Icon name="ChevronRight" size={16} className="text-muted shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function QuizPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [active, setActive] = useState<string | null>(null);

  if (!realtimeEnabled) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center gap-3 py-16 text-center">
          <Icon name="Wifi" size={32} className="text-muted" />
          <p className="font-medium">{t("mr.noDb")}</p>
        </CardBody>
      </Card>
    );
  }

  if (!hydrated) return null;
  if (!authUser) return <LoginRequired icon="Brain" />;

  if (active) {
    return <Room code={active} userId={authUser.id} userName={authUser.name} avatarUrl={authUser.avatarUrl} onLeave={() => setActive(null)} />;
  }
  return <Browser onEnter={setActive} />;
}
