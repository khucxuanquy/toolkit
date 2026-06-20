"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";
import { Button, Card, CardBody, Icon, Input, useToast } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { cn } from "@/shared/utils/cn";
import { useAuthStore } from "@/core/auth/auth-store";
import { realtimeEnabled } from "@/core/firebase/config";
import { getRtdb } from "@/core/firebase/app";
import { createDrawRoom, drawRoomExists, useDrawRoom } from "./useDrawRoom";
import { maskWord, pickWords } from "./words";
import type { DrawRoomMeta, DrawStroke } from "./types";

const COLORS = ["#0f172a", "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899", "#ffffff"];
const SIZES = [3, 6, 12];
const RES = 600; // canvas backing resolution

function useGuestId(): string {
  const [id] = useState(() => {
    if (typeof sessionStorage === "undefined") return crypto.randomUUID();
    const k = "dg-guest-id";
    const s = sessionStorage.getItem(k);
    if (s) return s;
    const n = crypto.randomUUID();
    sessionStorage.setItem(k, n);
    return n;
  });
  return id;
}

/* ------------------------------- Canvas -------------------------------- */
function DrawCanvas({
  strokes,
  canDraw,
  color,
  width,
  onBegin,
  onUpdate,
}: {
  strokes: Record<string, DrawStroke>;
  canDraw: boolean;
  color: string;
  width: number;
  onBegin: (s: DrawStroke) => string;
  onUpdate: (key: string, points: number[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const keyRef = useRef("");
  const bufRef = useRef<number[]>([]);
  const lastWrite = useRef(0);

  // Redraw whenever strokes change.
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    ctx.clearRect(0, 0, RES, RES);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const s of Object.values(strokes)) {
      if (!s.points || s.points.length < 2) continue;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(s.points[0] * RES, s.points[1] * RES);
      for (let i = 2; i < s.points.length; i += 2) ctx.lineTo(s.points[i] * RES, s.points[i + 1] * RES);
      ctx.stroke();
    }
  }, [strokes]);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  };

  const down = (e: React.PointerEvent) => {
    if (!canDraw) return;
    drawing.current = true;
    const [x, y] = pos(e);
    bufRef.current = [x, y];
    keyRef.current = onBegin({ color, width, points: [x, y], by: "me" });
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || !canDraw) return;
    const [x, y] = pos(e);
    bufRef.current.push(x, y);
    const now = Date.now();
    if (now - lastWrite.current > 90) {
      lastWrite.current = now;
      onUpdate(keyRef.current, [...bufRef.current]);
    }
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (keyRef.current) onUpdate(keyRef.current, [...bufRef.current]);
    keyRef.current = "";
  };

  return (
    <canvas
      ref={canvasRef}
      width={RES}
      height={RES}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerLeave={up}
      className={cn(
        "aspect-square w-full touch-none rounded-xl border border-border bg-white",
        canDraw ? "cursor-crosshair" : "cursor-default",
      )}
    />
  );
}

/* ------------------------------ Room view ------------------------------ */
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
  const room = useDrawRoom(code, userId, userName, avatarUrl);
  const { state, ordered, strokes, chat, isHost, isDrawer } = room;
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(SIZES[1]);
  const [guess, setGuess] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length]);

  // Word choices for the drawer during "choosing" — stable per turn.
  const choices = useMemo(
    () => (isDrawer && state.phase === "choosing" ? pickWords(locale, 3) : []),
    // state.round is intentional: regenerate fresh words each turn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDrawer, state.phase, state.round, locale],
  );

  const drawerName = ordered.find(([id]) => id === state.drawerId)?.[1].name ?? "?";
  const remain = Math.max(0, Math.ceil((state.turnEndsAt - now) / 1000));
  const canDraw = isDrawer && state.phase === "drawing";

  const submitGuess = () => {
    if (!guess.trim()) return;
    room.sendChat(guess);
    setGuess("");
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{t("dg.title")}</h2>
          <p className="text-muted text-xs">
            {t("dg.turn")} {Math.min(state.round, state.totalTurns) || 0}/{state.totalTurns || "—"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onLeave}>
          <Icon name="LogOut" size={15} /> {t("mr.leave")}
        </Button>
      </div>

      {/* Players / scoreboard */}
      <div className="flex flex-wrap gap-1.5">
        {ordered.map(([id, p]) => (
          <span
            key={id}
            className={cn(
              "flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs",
              id === state.drawerId ? "bg-primary/15 text-primary" : "bg-surface-2",
            )}
          >
            <span className="from-primary to-accent flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br text-[9px] font-bold text-white">
              {p.name.charAt(0).toUpperCase()}
            </span>
            {p.name}
            {id === state.drawerId && <Icon name="Pencil" size={11} />}
            {state.guessedIds?.[id] && <Icon name="Check" size={11} className="text-green-500" />}
            <span className="font-bold tabular-nums">{p.score}</span>
          </span>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Canvas column */}
        <div className="space-y-2">
          {/* Word / status bar */}
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="font-mono tracking-[0.3em]">
              {state.phase === "drawing" || state.phase === "reveal"
                ? isDrawer || state.phase === "reveal"
                  ? state.word
                  : maskWord(state.wordLen, state.spaces)
                : ""}
            </span>
            {(state.phase === "drawing" || state.phase === "reveal") && (
              <span className={cn("flex items-center gap-1 tabular-nums", remain <= 10 && "text-danger")}>
                <Icon name="Timer" size={14} /> {remain}s
              </span>
            )}
          </div>

          <div className="relative">
            <DrawCanvas
              strokes={strokes}
              canDraw={canDraw}
              color={color}
              width={width}
              onBegin={room.beginStroke}
              onUpdate={room.updateStroke}
            />

            {/* Phase overlays */}
            {state.phase === "lobby" && (
              <Overlay>
                <p className="font-semibold">{t("dg.waitingStart")}</p>
                <p className="text-muted text-sm">{t("dg.needPlayers")}</p>
                {isHost && (
                  <Button onClick={room.startGame} disabled={ordered.length < 2}>
                    <Icon name="Play" size={16} /> {t("dg.start")}
                  </Button>
                )}
              </Overlay>
            )}
            {state.phase === "choosing" && (
              <Overlay>
                {isDrawer ? (
                  <>
                    <p className="font-semibold">{t("dg.pickWord")}</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {choices.map((w) => (
                        <Button key={w} size="sm" onClick={() => room.chooseWord(w)}>
                          {w}
                        </Button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="font-semibold">{t("dg.choosing", { name: drawerName })}</p>
                )}
              </Overlay>
            )}
            {state.phase === "reveal" && (
              <Overlay>
                <p className="text-muted text-sm">{t("dg.wordWas")}</p>
                <p className="text-xl font-bold">{state.word}</p>
              </Overlay>
            )}
            {state.phase === "ended" && (
              <Overlay>
                <Icon name="Trophy" size={32} className="text-warning" />
                <p className="font-bold">{t("dg.gameOver")}</p>
                <div className="space-y-1 text-sm">
                  {[...ordered]
                    .sort((a, b) => b[1].score - a[1].score)
                    .slice(0, 3)
                    .map(([id, p], i) => (
                      <p key={id}>
                        {["🥇", "🥈", "🥉"][i]} {p.name} — {p.score}
                      </p>
                    ))}
                </div>
                {isHost && (
                  <Button onClick={room.playAgain}>
                    <Icon name="RotateCcw" size={16} /> {t("dg.playAgain")}
                  </Button>
                )}
              </Overlay>
            )}
          </div>

          {/* Drawing tools (drawer only) */}
          {canDraw && (
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ background: c }}
                  className={cn(
                    "h-6 w-6 rounded-full border border-border",
                    color === c && "ring-primary ring-2 ring-offset-1 ring-offset-surface",
                  )}
                />
              ))}
              <span className="bg-border mx-1 h-5 w-px" />
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => setWidth(s)}
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border border-border",
                    width === s && "border-primary",
                  )}
                >
                  <span className="rounded-full bg-foreground" style={{ width: s, height: s }} />
                </button>
              ))}
              <Button variant="outline" size="sm" onClick={room.clearStrokes} className="ml-auto">
                <Icon name="Trash2" size={14} /> {t("dg.clear")}
              </Button>
            </div>
          )}
        </div>

        {/* Chat / guesses */}
        <Card>
          <CardBody className="flex h-[360px] flex-col gap-2">
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 text-sm">
              {chat.map((m) => (
                <p
                  key={m.id}
                  className={cn(
                    m.kind === "correct" && "text-green-600 dark:text-green-400 font-medium",
                    m.kind === "system" && "text-muted italic",
                  )}
                >
                  {m.kind === "correct" || m.kind === "system" ? (
                    m.text
                  ) : (
                    <>
                      <span className="text-muted font-medium">{m.userName}:</span> {m.text}
                    </>
                  )}
                </p>
              ))}
              <div ref={chatEnd} />
            </div>
            {!isDrawer && state.phase === "drawing" ? (
              <div className="flex gap-2">
                <Input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  placeholder={t("dg.guessPlaceholder")}
                  onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                  disabled={!!state.guessedIds?.[userId]}
                  className="flex-1 text-sm"
                />
                <Button size="sm" onClick={submitGuess} disabled={!!state.guessedIds?.[userId]}>
                  <Icon name="Send" size={16} />
                </Button>
              </div>
            ) : (
              <p className="text-muted text-center text-xs">
                {isDrawer ? t("dg.youDraw") : t("dg.waitTurn")}
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl text-center backdrop-blur-sm">
      {children}
    </div>
  );
}

/* ----------------------------- Room browser ----------------------------- */
function Browser({ onEnter }: { onEnter: (code: string) => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [rooms, setRooms] = useState<DrawRoomMeta[]>([]);
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const db = getRtdb();

  useEffect(() => {
    if (!db) return;
    return onValue(ref(db, "drawRooms"), (snap) => {
      const val = (snap.val() ?? {}) as Record<string, { meta?: DrawRoomMeta }>;
      setRooms(
        Object.values(val)
          .map((v) => v.meta)
          .filter((m): m is DrawRoomMeta => !!m)
          .sort((a, b) => b.createdAt - a.createdAt)
          .slice(0, 12),
      );
    });
  }, [db]);

  const create = async () => {
    setBusy(true);
    try {
      onEnter(await createDrawRoom(name));
    } catch {
      toast(t("mr.noDb"), "error");
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    const c = joinCode.trim().toUpperCase();
    if (!c) return;
    if (await drawRoomExists(c)) onEnter(c);
    else toast(t("mr.notFound"), "error");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardBody className="space-y-3">
            <h3 className="font-semibold">{t("dg.createRoom")}</h3>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("mr.roomName")} onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button className="w-full" onClick={create} disabled={busy}>
              <Icon name="Plus" size={16} /> {t("dg.createRoom")}
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
                <Icon name="Pencil" size={20} className="text-primary shrink-0" />
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

/* ------------------------------ Top level ------------------------------ */
export default function DrawGuessPage() {
  const { t } = useTranslation();
  const authUser = useAuthStore((s) => s.user);
  const guestId = useGuestId();
  const [guestName, setGuestName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const userId = authUser?.id ?? guestId;
  const userName = authUser?.name ?? guestName;

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

  if (!userName && pending !== null) {
    const go = () => {
      if (!nameInput.trim()) return;
      setGuestName(nameInput.trim());
      setActive(pending);
      setPending(null);
    };
    return (
      <Card className="mx-auto max-w-sm">
        <CardBody className="space-y-4">
          <div className="text-center">
            <Icon name="Pencil" size={32} className="text-primary mx-auto mb-2" />
            <h2 className="text-lg font-bold">{t("mr.yourName")}</h2>
          </div>
          <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder={t("mr.yourName")} autoFocus onKeyDown={(e) => e.key === "Enter" && go()} />
          <Button className="w-full" disabled={!nameInput.trim()} onClick={go}>
            {t("mr.continue")}
          </Button>
        </CardBody>
      </Card>
    );
  }

  const enter = (code: string) => {
    if (!userName) setPending(code);
    else setActive(code);
  };

  if (active) {
    return (
      <Room code={active} userId={userId} userName={userName} avatarUrl={authUser?.avatarUrl} onLeave={() => setActive(null)} />
    );
  }
  return <Browser onEnter={enter} />;
}
