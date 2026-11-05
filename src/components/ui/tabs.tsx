import type { ReactNode } from "react";
import { onRovingKeyDown } from "@/lib/roving";
import { cn } from "@/lib/utils";
import { FOCUS_RING } from "./button";

interface TabsProps<T extends string> {
  tabs: readonly { value: T; label: ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the tablist. */
  label: string;
  className?: string;
}

/** Tabs switch what you're looking at (Segmented picks a value): an accent underline, one tab stop, arrows move and select. */
export function Tabs<T extends string>({ tabs, value, onChange, label, className }: TabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} onKeyDown={(e) => onRovingKeyDown(e, '[role="tab"]')} className={cn("flex gap-4 border-b border-ui-subtle", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange(t.value)}
          className={cn(
            "-mb-px h-9 rounded-t-ui-sm border-b-2 text-body transition-colors duration-(--ui-dur-fast) ease-ui",
            FOCUS_RING,
            t.value === value ? "border-ui-accent font-medium text-ui-1" : "border-transparent text-ui-3 hover:text-ui-1",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
