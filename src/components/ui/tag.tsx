import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./button";

interface TagProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The filter is on. */
  selected?: boolean;
}

/** A filter chip: a 6 px tag (only status chips are full pills). */
export function Tag({ selected, className, children, ...props }: TagProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-ui-sm border px-2 text-caption transition-colors duration-(--ui-dur-fast) ease-ui",
        FOCUS_RING,
        selected ? "border-ui-accent text-ui-1" : "border-ui-strong text-ui-3 hover:text-ui-1",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
