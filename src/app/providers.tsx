"use client";

import { useEffect, type ReactNode } from "react";
// Registers every plugin into the registry (import side effect).
import "@/core/registry/register-plugins";
import { usePlatformStore } from "@/core/services/platform-store";
import { useAuthStore } from "@/core/auth/auth-store";
import { PwaManager } from "@/core/services/PwaManager";
import { Toaster } from "@/shared/ui";

export function Providers({ children }: { children: ReactNode }) {
  const hydrate = usePlatformStore((s) => s.hydrate);
  const hydrateAuth = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateAuth();
    // Re-enable theme transitions only after first paint to avoid flash.
    document.documentElement.classList.add("theme-transition");
  }, [hydrate, hydrateAuth]);

  return (
    <>
      {children}
      <Toaster />
      <PwaManager />
    </>
  );
}
