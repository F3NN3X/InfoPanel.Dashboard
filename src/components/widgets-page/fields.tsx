// The builder inspector's rows: a label on the left and its control on the right, as the mockup's Block, Options and Presets tabs
// lay them out, on the studio's chrome tokens.
import type { ReactNode } from "react";
import { FOCUS_RING } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const INPUT = cn("h-8 min-w-0 rounded-ui-md border border-ui-strong bg-ui-app px-2.5 text-body text-ui-1 outline-none hover:border-ui-hover-edge focus:border-ui-accent", FOCUS_RING);

/** A labelled row: the label, then the control at the right. */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className="min-w-0 truncate text-body text-ui-2" title={hint}>
        {label}
      </span>
      <div className="flex min-w-0 shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

/** A section's small heading ("Data", "Look"). */
export function Heading({ children }: { children: ReactNode }) {
  return <h3 className="mt-2 text-caption text-ui-3">{children}</h3>;
}

/** A number field that commits a finite number (an empty or bad entry keeps the last one), with a unit after it. */
/** A number field; empty is "not set", and `placeholder` says what that draws. */
export function NumberInput({ label, value, onChange, unit, min, max, step, width = 72, placeholder }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; unit?: string; min?: number; max?: number; step?: number; width?: number; placeholder?: string }) {
  return (
    <span className="relative flex items-center">
      <input
        aria-label={label}
        type="number"
        value={value ?? ""}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value);
          if (v === undefined || Number.isFinite(v)) onChange(v);
        }}
        className={cn(INPUT, "font-ui-mono", unit && "pr-7")}
        style={{ width }}
      />
      {unit && <span className="pointer-events-none absolute right-2 font-ui-mono text-micro text-ui-3">{unit}</span>}
    </span>
  );
}

export function TextInput({ label, value, onChange, width = 160, placeholder }: { label: string; value: string; onChange: (v: string) => void; width?: number; placeholder?: string }) {
  return <input aria-label={label} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={INPUT} style={{ width }} />;
}

export function Select<T extends string>({ label, value, options, onChange, width = 160 }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void; width?: number }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(INPUT, "pr-6")} style={{ width }}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
