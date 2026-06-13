"use client";

import { Icon } from "./Icon";
import { cn } from "@/shared/utils/cn";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search tools & games…",
  className,
}: SearchBarProps) {
  return (
    <div className={cn("relative", className)}>
      <Icon
        name="Search"
        size={18}
        className="text-muted pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        className={cn(
          "border-border bg-surface h-11 w-full rounded-xl border pr-3 pl-10 text-sm",
          "text-foreground placeholder:text-muted",
          "focus-visible:border-primary focus-visible:ring-ring transition-colors outline-none focus-visible:ring-2",
        )}
      />
    </div>
  );
}
