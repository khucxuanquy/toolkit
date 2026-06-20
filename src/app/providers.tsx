"use client";

import { useEffect, type ReactNode } from "react";
// Registers every plugin into the registry (import side effect).
import "@/core/registry/register-plugins";
import { usePlatformStore } from "@/core/services/platform-store";
import { useAuthStore } from "@/core/auth/auth-store";
import { PwaManager } from "@/core/services/PwaManager";
import { Toaster } from "@/shared/ui";
import { FeedbackButton } from "@/shared/components/FeedbackButton";
import { firebaseEnabled } from "@/core/firebase/config";

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = usePlatformStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateAuth();
    // Re-enable theme transitions only after first paint to avoid flash.
    document.documentElement.classList.add("theme-transition");
    // Fire up Firebase Analytics (lazy; no-op without a measurementId).
    if (firebaseEnabled) {
      void import("@/core/firebase/analytics").then((m) => m.initAnalytics());
    }
  }, [hydrate, hydrateAuth]);

  return (
    <>
      {children}
      <FeedbackButton />
      <Toaster />
      <PwaManager />
    </>
  );
}
