"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/shared/utils/cn";
import { useMounted } from "@/shared/hooks/useMounted";
import { Icon } from "./Icon";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Hide the default close (X) button. */
  hideClose?: boolean;
}

export function Modal({ open, onClose, title, children, className, hideClose }: ModalProps) {
  const mounted = useMounted();

  // Close on Escape and lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              "border-border bg-surface relative z-10 w-full max-w-lg rounded-2xl border shadow-xl",
              className,
            )}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
          >
            {(title || !hideClose) && (
              <div className="border-border flex items-center justify-between border-b p-4">
                <h2 className="text-base font-semibold">{title}</h2>
                {!hideClose && (
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="text-muted hover:bg-surface-2 hover:text-foreground rounded-lg p-1 transition-colors"
                  >
                    <Icon name="X" size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="p-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
