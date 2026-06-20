"use client";

/**
 * Admin + global feedback backend (Firebase Realtime Database).
 *
 * Access model — keyed by uid so server-side rules can gate cleanly:
 *   - The SUPER admin email is hard-coded. On sign-in it self-registers its uid
 *     under `admins/{uid}` (role "super").
 *   - The super admin invites others by email → `adminInvites/{pushId}`. When an
 *     invited user signs in, they're promoted to `admins/{uid}` (role "admin")
 *     and the invite is consumed.
 *   - `isAdmin` = the current user's uid exists under `admins` (or super email).
 *
 * The client gate is UX only; real protection lives in the RTDB rules (see the
 * recommended ruleset shipped with this feature).
 */

import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get as dbGet,
} from "firebase/database";
import { getRtdb } from "@/core/firebase/app";
import type { AuthUser } from "@/core/auth/types";

export const SUPER_ADMIN_EMAIL = "khucxuanquy@gmail.com";

export type FeedbackCategory = "bug" | "idea" | "praise" | "other";
export type FeedbackStatus = "new" | "resolved";

export interface Feedback {
  id: string;
  text: string;
  category: FeedbackCategory;
  status: FeedbackStatus;
  userId: string | null;
  userName: string;
  userEmail: string | null;
  page: string;
  createdAt: number;
}

export type AdminRole = "super" | "admin";
export interface AdminEntry {
  id: string; // uid
  email: string;
  name: string;
  role: AdminRole;
  addedAt: number;
}
export interface AdminInvite {
  id: string; // sanitized-email key
  email: string;
  addedAt: number;
  addedBy: string;
}

/** RTDB keys can't contain '.', so dots are stored as ','. ('@' is allowed.) */
const emailKey = (email: string) => lc(email).replace(/\./g, ",");

export interface Announcement {
  text: string;
  type: "info" | "warning" | "success";
  active: boolean;
  updatedAt: number;
  by: string;
}

const lc = (s: string) => s.trim().toLowerCase();

/* ------------------------------- Feedback ------------------------------- */

export async function submitFeedback(input: {
  text: string;
  category: FeedbackCategory;
  user: AuthUser | null;
  page: string;
}): Promise<void> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  const fbRef = push(ref(db, "feedback"));
  const fb: Omit<Feedback, "id"> = {
    text: input.text.trim().slice(0, 2000),
    category: input.category,
    status: "new",
    userId: input.user?.id ?? null,
    userName: input.user?.name ?? "Khách",
    userEmail: input.user?.email ?? null,
    page: input.page,
    createdAt: Date.now(),
  };
  await set(fbRef, fb);
}

export function watchFeedback(cb: (list: Feedback[]) => void): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  return onValue(ref(db, "feedback"), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Omit<Feedback, "id">>;
    const list = Object.entries(val)
      .map(([id, v]) => ({ ...v, id }))
      .sort((a, b) => b.createdAt - a.createdAt);
    cb(list);
  });
}

export function setFeedbackStatus(id: string, status: FeedbackStatus): void {
  const db = getRtdb();
  if (!db) return;
  void update(ref(db, `feedback/${id}`), { status });
}

export function deleteFeedback(id: string): void {
  const db = getRtdb();
  if (!db) return;
  void remove(ref(db, `feedback/${id}`));
}

/* -------------------------------- Admins -------------------------------- */

export function watchAdmins(cb: (list: AdminEntry[]) => void): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  return onValue(ref(db, "admins"), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Omit<AdminEntry, "id">>;
    const list = Object.entries(val)
      .map(([id, v]) => ({ ...v, id }))
      .sort((a, b) => (a.role === "super" ? -1 : b.role === "super" ? 1 : a.addedAt - b.addedAt));
    cb(list);
  });
}

export function watchInvites(cb: (list: AdminInvite[]) => void): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  return onValue(ref(db, "inviteEmails"), (snap) => {
    const val = (snap.val() ?? {}) as Record<string, Omit<AdminInvite, "id">>;
    cb(Object.entries(val).map(([id, v]) => ({ ...v, id })));
  });
}

export async function inviteAdmin(email: string, by: string): Promise<void> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  const e = lc(email);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("admin.err.email");

  // Already an active admin?
  const admins = (await dbGet(ref(db, "admins"))).val() ?? {};
  if (Object.values(admins as Record<string, AdminEntry>).some((a) => lc(a.email) === e)) {
    throw new Error("admin.err.exists");
  }
  // Already invited? (keyed by sanitized email)
  if ((await dbGet(ref(db, `inviteEmails/${emailKey(e)}`))).exists()) {
    throw new Error("admin.err.invited");
  }
  await set(ref(db, `inviteEmails/${emailKey(e)}`), { email: e, addedAt: Date.now(), addedBy: by });
}

export function removeAdmin(id: string): void {
  const db = getRtdb();
  if (!db) return;
  void remove(ref(db, `admins/${id}`));
}

export function cancelInvite(id: string): void {
  const db = getRtdb();
  if (!db) return;
  // `id` is the sanitized-email key.
  void remove(ref(db, `inviteEmails/${id}`));
}

/**
 * Reconcile the signed-in user's admin status: self-register the super admin and
 * promote any user whose email has a pending invite. Safe to call on every sign-in.
 */
export async function reconcileAdmin(user: AuthUser): Promise<void> {
  const db = getRtdb();
  if (!db) return;
  const email = lc(user.email);

  const existing = (await dbGet(ref(db, `admins/${user.id}`))).val();
  if (existing) {
    // Keep email/name fresh.
    void update(ref(db, `admins/${user.id}`), { email, name: user.name });
    return;
  }

  if (email === SUPER_ADMIN_EMAIL) {
    await set(ref(db, `admins/${user.id}`), {
      email,
      name: user.name,
      role: "super",
      addedAt: Date.now(),
    });
    return;
  }

  // Promote if invited (invite keyed by sanitized email → O(1) lookup).
  const invited = (await dbGet(ref(db, `inviteEmails/${emailKey(email)}`))).exists();
  if (invited) {
    await set(ref(db, `admins/${user.id}`), {
      email,
      name: user.name,
      role: "admin",
      addedAt: Date.now(),
    });
    void remove(ref(db, `inviteEmails/${emailKey(email)}`)); // best-effort cleanup
  }
}

/* ----------------------------- Announcement ----------------------------- */

export function watchAnnouncement(cb: (a: Announcement | null) => void): () => void {
  const db = getRtdb();
  if (!db) return () => {};
  return onValue(ref(db, "announcement"), (snap) => {
    cb(snap.exists() ? (snap.val() as Announcement) : null);
  });
}

export async function saveAnnouncement(a: Omit<Announcement, "updatedAt">): Promise<void> {
  const db = getRtdb();
  if (!db) throw new Error("mr.noDb");
  await set(ref(db, "announcement"), { ...a, updatedAt: Date.now() });
}
