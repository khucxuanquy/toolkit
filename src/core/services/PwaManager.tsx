"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Icon } from "@/shared/ui";
import { useTranslation } from "@/core/i18n/useTranslation";

/** The non-standard install-prompt event exposed by Chromium browsers. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker (production only) and surfaces a custom
 * "Install app" prompt when the browser offers one.
 */
export function PwaManager() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const { t } = useTranslation();

  // Register the service worker. React hydrates *after* window's `load` event,
  // so register immediately when the document is already loaded.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* registration failures are non-fatal */
      });
    };
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  // Capture the install prompt.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setVisible(false);
    setDeferred(null);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="border-border bg-surface fixed right-4 bottom-4 z-50 flex items-center gap-3 rounded-2xl border p-3 pr-2 shadow-xl"
        >
          <span className="from-primary to-accent flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br text-white">
            <Icon name="Sparkles" size={18} />
          </span>
          <div className="text-sm">
            <p className="font-semibold">{t("pwa.title")}</p>
            <p className="text-muted">{t("pwa.subtitle")}</p>
          </div>
          <Button size="sm" onClick={install}>
            {t("pwa.install")}
          </Button>
          <button
            onClick={() => setVisible(false)}
            aria-label={t("pwa.dismiss")}
            className="text-muted hover:bg-surface-2 rounded-lg p-1"
          >
            <Icon name="X" size={16} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
