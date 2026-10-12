import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name of the group. */
  label?: string;
  className?: string;
}

/** Segmented control (Solid | Pattern style): a radiogroup on the chrome tokens. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: SegmentedProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap rounded-md border border-ui-default bg-ui-app p-0.5", className)}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-[5px] px-2 py-1 text-xs transition-colors",
            o.value === value ? "bg-ui-active text-ui-1" : "text-ui-3 hover:text-ui-1"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
