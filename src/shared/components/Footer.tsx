"use client";

import { useTranslation } from "@/core/i18n/useTranslation";
import { Icon } from "@/shared/ui";

// Evaluated once at module load — avoids an impure Date() call during render.
const YEAR = new Date().getFullYear();

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-border mt-12 border-t">
      <div className="text-muted mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm sm:flex-row">
        <p className="text-center sm:text-left">
          © {YEAR} Quy&apos;s Toolkit · {t("footer.tagline")}
        </p>

        <div className="flex items-center gap-4">
          <a
            href="mailto:khucxuanquy@gmail.com"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <Icon name="Mail" size={16} /> khucxuanquy@gmail.com
          </a>
          <a
            href="https://www.facebook.com/quy.khucxuan"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
              <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.14 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.9h-2.34V22c4.78-.8 8.44-4.94 8.44-9.94Z" />
            </svg>
            Facebook
          </a>
        </div>
      </div>
    </footer>
  );
}
