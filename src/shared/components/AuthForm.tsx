"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "@/core/i18n/useTranslation";
import { useAuthStore } from "@/core/auth/auth-store";
import { firebaseEnabled } from "@/core/firebase/config";
import { Button, Input, Icon, Tabs, useToast } from "@/shared/ui";
import { cn } from "@/shared/utils/cn";

type Mode = "signin" | "signup";

const loginSchema = z.object({
  email: z.string().email("auth.err.emailInvalid"),
  password: z.string().min(6, "auth.err.passwordMin"),
});
type LoginValues = z.infer<typeof loginSchema>;

const signupSchema = z
  .object({
    name: z.string().trim().min(1, "auth.err.nameRequired"),
    email: z.string().email("auth.err.emailInvalid"),
    password: z.string().min(6, "auth.err.passwordMin"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "auth.err.passwordMismatch",
  });
type SignupValues = z.infer<typeof signupSchema>;

/** Map a thrown auth error to an i18n key. */
function errorKey(e: unknown): string {
  const msg = e instanceof Error ? e.message : "";
  return msg.startsWith("auth.err.") ? msg : "auth.err.generic";
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export function AuthForm({ initialMode = "signin" }: { initialMode?: Mode }) {
  const router = useRouter();
  const { t } = useTranslation();
  const toast = useToast();
  const signInEmail = useAuthStore((s) => s.signInEmail);
  const signUpEmail = useAuthStore((s) => s.signUpEmail);
  const signInGoogle = useAuthStore((s) => s.signInGoogle);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const login = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const signup = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirm: "" },
  });

  const finish = (messageKey: string) => {
    toast(t(messageKey), "success");
    router.push("/");
  };

  const switchMode = (next: Mode) => {
    setFormError(null);
    setMode(next);
  };

  const onLogin = login.handleSubmit(async (v) => {
    setPending(true);
    setFormError(null);
    try {
      await signInEmail(v);
      finish("auth.welcomeBack");
    } catch (e) {
      setFormError(t(errorKey(e)));
      setPending(false);
    }
  });

  const onSignup = signup.handleSubmit(async (v) => {
    setPending(true);
    setFormError(null);
    try {
      await signUpEmail({ name: v.name, email: v.email, password: v.password });
      finish("auth.accountCreated");
    } catch (e) {
      setFormError(t(errorKey(e)));
      setPending(false);
    }
  });

  const onGoogle = async () => {
    setPending(true);
    setFormError(null);
    try {
      await signInGoogle();
      finish("auth.welcomeBack");
    } catch {
      setFormError(t("auth.err.generic"));
      setPending(false);
    }
  };

  const passwordToggle = (
    <button
      type="button"
      onClick={() => setShowPw((v) => !v)}
      aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")}
      className="text-muted hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1"
    >
      <Icon name={showPw ? "EyeOff" : "Eye"} size={16} />
    </button>
  );

  return (
    <div className="space-y-5">
      <Tabs<Mode>
        items={[
          { value: "signin", label: t("auth.signIn") },
          { value: "signup", label: t("auth.signUp") },
        ]}
        value={mode}
        onChange={switchMode}
        className="w-full justify-center"
      />

      <Button variant="outline" size="lg" className="w-full" onClick={onGoogle} disabled={pending}>
        <GoogleGlyph />
        {t("auth.continueGoogle")}
      </Button>

      <div className="flex items-center gap-3">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted text-xs uppercase">{t("auth.or")}</span>
        <span className="bg-border h-px flex-1" />
      </div>

      {formError && (
        <p className="border-danger/30 bg-danger/10 text-danger rounded-lg border px-3 py-2 text-sm">
          {formError}
        </p>
      )}

      {mode === "signin" ? (
        <form onSubmit={onLogin} className="space-y-3" noValidate>
          <Field label={t("auth.email")} error={errMsg(t, login.formState.errors.email?.message)}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              {...login.register("email")}
            />
          </Field>
          <Field
            label={t("auth.password")}
            error={errMsg(t, login.formState.errors.password?.message)}
          >
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                className="pr-10"
                {...login.register("password")}
              />
              {passwordToggle}
            </div>
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? t("auth.processing") : t("auth.signIn")}
          </Button>
        </form>
      ) : (
        <form onSubmit={onSignup} className="space-y-3" noValidate>
          <Field label={t("auth.name")} error={errMsg(t, signup.formState.errors.name?.message)}>
            <Input
              autoComplete="name"
              placeholder={t("auth.namePlaceholder")}
              {...signup.register("name")}
            />
          </Field>
          <Field label={t("auth.email")} error={errMsg(t, signup.formState.errors.email?.message)}>
            <Input
              type="email"
              autoComplete="email"
              placeholder="ban@email.com"
              {...signup.register("email")}
            />
          </Field>
          <Field
            label={t("auth.password")}
            error={errMsg(t, signup.formState.errors.password?.message)}
          >
            <div className="relative">
              <Input
                type={showPw ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className="pr-10"
                {...signup.register("password")}
              />
              {passwordToggle}
            </div>
          </Field>
          <Field
            label={t("auth.confirmPassword")}
            error={errMsg(t, signup.formState.errors.confirm?.message)}
          >
            <Input
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              {...signup.register("confirm")}
            />
          </Field>
          <Button type="submit" size="lg" className="w-full" disabled={pending}>
            {pending ? t("auth.processing") : t("auth.createAccount")}
          </Button>
        </form>
      )}

      <p className="text-muted text-center text-sm">
        {mode === "signin" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
        <button
          type="button"
          onClick={() => switchMode(mode === "signin" ? "signup" : "signin")}
          className="text-primary font-medium hover:underline"
        >
          {mode === "signin" ? t("auth.signUp") : t("auth.signIn")}
        </button>
      </p>

      {!firebaseEnabled && (
        <p className="text-muted text-center text-xs">{t("auth.demoGoogleNote")}</p>
      )}

      <div className="text-center">
        <Link href="/" className="text-muted text-sm hover:underline">
          {t("auth.skip")}
        </Link>
      </div>
    </div>
  );
}

/** Resolve a zod message (which we store as an i18n key) to localized text. */
function errMsg(t: (k: string) => string, message?: string): string | undefined {
  return message ? t(message) : undefined;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className={cn("text-sm font-medium", error ? "text-danger" : "text-foreground")}>
        {label}
      </span>
      {children}
      {error && <span className="text-danger block text-xs">{error}</span>}
    </label>
  );
}
