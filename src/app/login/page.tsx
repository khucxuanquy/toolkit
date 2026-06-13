"use client";

import { Card, CardBody, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";
import { AuthForm } from "@/shared/components/AuthForm";

export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto w-full max-w-sm py-6 sm:py-10">
      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <span className="from-primary to-accent flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm">
          <Icon name="Sparkles" size={24} />
        </span>
        <h1 className="text-xl font-bold tracking-tight">{t("auth.welcomeTitle")}</h1>
        <p className="text-muted text-sm">{t("auth.optionalNote")}</p>
      </div>

      <Card>
        <CardBody>
          <AuthForm />
        </CardBody>
      </Card>
    </div>
  );
}
