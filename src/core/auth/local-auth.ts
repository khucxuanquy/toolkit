import { createNamespace } from "@/core/storage/storage";
import type { AuthService, AuthUser, SignInInput, SignUpInput } from "./types";

/**
 * Local, in-browser auth implementation. Accounts and the active session live
 * in IndexedDB — there is no server. Passwords are stored only as a salted
 * SHA-256 hash. This is a demo-grade implementation (fine for a personal
 * offline app); it implements {@link AuthService} so it can be replaced by a
 * real provider without touching the UI.
 */

const store = createNamespace("auth");
const USERS_KEY = "users";
const SESSION_KEY = "session";

/** Stored record keeps the credentials; never expose this shape to the UI. */
interface StoredUser extends AuthUser {
  emailLower: string;
  salt?: string;
  hash?: string;
}

function toPublic(u: StoredUser): AuthUser {
  return { id: u.id, email: u.email, name: u.name, provider: u.provider, avatarUrl: u.avatarUrl };
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomSalt(): string {
  const a = new Uint8Array(16);
  crypto.getRandomValues(a);
  return toHex(a);
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return toHex(new Uint8Array(digest));
}

async function getUsers(): Promise<Record<string, StoredUser>> {
  return store.load<Record<string, StoredUser>>(USERS_KEY, {});
}

async function setSession(user: AuthUser | null): Promise<void> {
  if (user) await store.save(SESSION_KEY, user);
  else await store.remove(SESSION_KEY);
}

export const localAuth: AuthService = {
  async getSession() {
    return store.load<AuthUser | null>(SESSION_KEY, null);
  },

  async signUpEmail({ name, email, password }: SignUpInput) {
    const emailLower = email.trim().toLowerCase();
    const users = await getUsers();
    if (users[emailLower]) throw new Error("auth.err.emailInUse");

    const salt = randomSalt();
    const hash = await hashPassword(password, salt);
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email: email.trim(),
      emailLower,
      name: name.trim() || email.trim().split("@")[0],
      provider: "password",
      salt,
      hash,
    };
    users[emailLower] = user;
    await store.save(USERS_KEY, users);

    const pub = toPublic(user);
    await setSession(pub);
    return pub;
  },

  async signInEmail({ email, password }: SignInInput) {
    const emailLower = email.trim().toLowerCase();
    const users = await getUsers();
    const u = users[emailLower];
    if (!u || u.provider !== "password" || !u.salt || !u.hash) {
      throw new Error("auth.err.invalidCredentials");
    }
    const hash = await hashPassword(password, u.salt);
    if (hash !== u.hash) throw new Error("auth.err.invalidCredentials");

    const pub = toPublic(u);
    await setSession(pub);
    return pub;
  },

  // Demo Google sign-in: no real OAuth (that needs a provider + keys). Creates
  // or reuses a local "Google" account so the flow is fully wired end-to-end.
  async signInGoogle() {
    const emailLower = "demo@gmail.com";
    const users = await getUsers();
    let u = users[emailLower];
    if (!u) {
      u = {
        id: crypto.randomUUID(),
        email: "demo@gmail.com",
        emailLower,
        name: "Google User",
        provider: "google",
      };
      users[emailLower] = u;
      await store.save(USERS_KEY, users);
    }
    const pub = toPublic(u);
    await setSession(pub);
    return pub;
  },

  async signOut() {
    await setSession(null);
  },
};
