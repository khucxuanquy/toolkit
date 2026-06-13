import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "border-border bg-surface h-10 w-full rounded-xl border px-3 text-sm",
        "text-foreground placeholder:text-muted",
        "focus-visible:border-primary focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
});
