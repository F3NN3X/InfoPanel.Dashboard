import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { COLOR_FALLBACK } from "../widget-kinds";

/* Small labelled inputs shared by the panel and widget editors. */

export const INPUT =
  "w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring";

export function Field({ label, hint, children }: { label: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">
        {label}
        {hint && <span className="text-muted-foreground/60"> ({hint})</span>}
      </div>
      {children}
    </div>
  );
}

/** A text input; "" is stored as `undefined`. */
export function TextInput({
  value,
  placeholder,
  mono,
  onChange,
}: {
  value: string | undefined;
  placeholder?: string;
  mono?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      spellCheck={mono ? false : undefined}
      onChange={(e) => onChange(e.target.value || undefined)}
      className={cn(INPUT, mono && "font-mono text-[11px]")}
    />
  );
}

/**
 * A number input clamped to [min, max]. With `optional`, clearing it
 * stores `undefined` (the placeholder shows the automatic value);
 * otherwise an empty / invalid entry stores `fallback`.
 */
export function NumberInput({
  value,
  min,
  max,
  step,
  fallback,
  optional,
  placeholder,
  float,
  className,
  onChange,
}: {
  value: number | undefined;
  min?: number;
  max?: number;
  step?: number | "any";
  fallback: number;
  optional?: boolean;
  placeholder?: string;
  /** Allow fractions (default: integers). */
  float?: boolean;
  className?: string;
  onChange: (value: number | undefined) => void;
}) {
  const clamp = (n: number) => Math.max(min ?? -Infinity, Math.min(max ?? Infinity, n));
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value ?? (optional ? "" : fallback)}
      placeholder={placeholder}
      onChange={(e) => {
        if (optional && e.target.value === "") return onChange(undefined);
        const n = float ? parseFloat(e.target.value) : parseInt(e.target.value, 10);
        onChange(clamp(Number.isFinite(n) ? n : fallback));
      }}
      className={cn(INPUT, "tabular-nums", className ?? "w-24")}
    />
  );
}

/** A labelled on/off switch row. */
export function Switch({
  label,
  on,
  onChange,
  className,
}: {
  label: ReactNode;
  on: boolean;
  onChange: (on: boolean) => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => onChange(!on)}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent/40",
        className
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          on ? "bg-ring" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
            on ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** A color override with a "Use theme" reset (`undefined` = theme). */
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        {value && (
          <button type="button" onClick={() => onChange(undefined)} className="hover:text-foreground">
            Use theme
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value ?? COLOR_FALLBACK}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
        />
        <span className="text-xs tabular-nums text-muted-foreground">{value ?? "theme"}</span>
      </div>
    </div>
  );
}
