export type AuthProviderId = "password" | "google";

/** The public, safe-to-expose user shape (never contains credentials). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  provider: AuthProviderId;
  avatarUrl?: string;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

/**
 * The contract the rest of the app depends on. The current implementation is
 * local/in-browser ({@link import("./local-auth")}); swapping to a real
 * provider (Firebase, Supabase, …) only means providing another object with
 * this same shape.
 */
export interface AuthService {
  getSession(): Promise<AuthUser | null>;
  signUpEmail(input: SignUpInput): Promise<AuthUser>;
  signInEmail(input: SignInInput): Promise<AuthUser>;
  signInGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
}

/** Error codes thrown by the auth service — also used as i18n keys. */
export type AuthErrorCode =
  | "auth.err.emailInUse"
  | "auth.err.invalidCredentials"
  | "auth.err.generic";
