"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./Icon";
import { cn } from "@/shared/utils/cn";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, type?: ToastType) => void;
  dismiss: (id: number) => void;
}

let counter = 0;

const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: (message, type = "info") => {
    const id = ++counter;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismiss(id), 3200);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

/** Hook used anywhere to raise a toast: `const toast = useToast(); toast("Saved")`. */
export function useToast() {
  const push = useToastStore((s) => s.push);
  return push;
}

const styles: Record<ToastType, { icon: string; cls: string }> = {
  success: { icon: "Check", cls: "border-success/40 text-success" },
  error: { icon: "X", cls: "border-danger/40 text-danger" },
  info: { icon: "Sparkles", cls: "border-primary/40 text-primary" },
};

/** Mount once near the app root. */
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            onClick={() => dismiss(t.id)}
            className={cn(
              "bg-surface pointer-events-auto flex max-w-sm cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium shadow-lg",
              styles[t.type].cls,
            )}
          >
            <Icon name={styles[t.type].icon} size={16} />
            <span className="text-foreground">{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
