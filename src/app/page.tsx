"use client";

import { Dashboard } from "@/shared/components/Dashboard";
import { useTranslation } from "@/core/i18n/useTranslation";

export default function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("home.title")}</h1>
        <p className="text-muted mt-1">{t("home.subtitle")}</p>
      </section>
      <Dashboard />
    </div>
  );
}
