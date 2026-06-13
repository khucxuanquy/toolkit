"use client";

import Link from "next/link";
import { Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

export default function OfflinePage() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <span className="bg-surface-2 text-muted flex h-16 w-16 items-center justify-center rounded-2xl">
        <Icon name="WifiOff" size={30} />
      </span>
      <h1 className="text-xl font-semibold">{t("offline.title")}</h1>
      <p className="text-muted max-w-sm text-sm">{t("offline.msg")}</p>
      <Link
        href="/"
        className="text-primary mt-2 inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <Icon name="Home" size={16} /> {t("offline.back")}
      </Link>
    </div>
  );
}
