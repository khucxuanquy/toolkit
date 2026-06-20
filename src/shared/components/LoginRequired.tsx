"use client";

import { useRouter } from "next/navigation";
import { Button, Card, CardBody, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

/**
 * Gate shown by apps that require a signed-in account (realtime multiplayer
 * features). Sends the user to the login page.
 */
export function LoginRequired({
  icon = "Lock",
  title,
  message,
}: {
  icon?: string;
  title?: string;
  message?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Card className="mx-auto max-w-sm">
      <CardBody className="flex flex-col items-center gap-3 py-12 text-center">
        <span className="from-primary to-accent flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-sm">
          <Icon name={icon} size={26} />
        </span>
        <h2 className="text-lg font-bold">{title ?? t("auth.loginRequiredTitle")}</h2>
        <p className="text-muted max-w-xs text-sm">{message ?? t("auth.loginRequiredMsg")}</p>
        <Button className="mt-1" onClick={() => router.push("/login")}>
          <Icon name="LogIn" size={16} /> {t("auth.signIn")}
        </Button>
      </CardBody>
    </Card>
  );
}
