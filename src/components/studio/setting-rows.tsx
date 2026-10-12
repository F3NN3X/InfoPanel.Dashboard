import type { ReactNode } from "react";
import { Segmented } from "@/components/ui/segmented";
import { cn } from "@/lib/utils";

/**
 * Compact setting rows for the inspector cards: one line where the control
 * is small (label left, control right), label over control otherwise. The
 * state dot and hover reset live in `SettingField`'s left gutter, so a row
 * is just its label and control.
 */

const FIELD =
  "rounded-md border border-border bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

/** The label of a row (truncated to one line, full text on hover). */
function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      title={typeof children === "string" ? children : undefined}
      className={cn("min-w-0 truncate text-xs text-muted-foreground", className)}
    >
      {children}
    </span>
  );
}

/** Label over a full-width control (segmented, text, lists, pickers). */
export function StackRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex min-h-5 items-center">
        <Label>{label}</Label>
      </div>
      {children}
    </div>
  );
}

/** Label left, control right, one line. */
function InlineRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <Label className="flex-1">{label}</Label>
      {children}
    </div>
  );
}

export function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className="flex min-h-6 w-full items-center justify-between gap-2 text-left"
    >
      <Label className="flex-1">{label}</Label>
      <span
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full transition-colors",
          value ? "bg-ring" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
            value ? "left-3.5" : "left-0.5"
          )}
        />
      </span>
    </button>
  );
}

/** A number: a slider under the label when bounded, with an inline numeric input. */
export function SliderRow({
  label,
  value,
  min,
  max,
  step,
  fallback,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Used when the input is cleared. */
  fallback: number;
  onChange: (value: number) => void;
}) {
  const ranged = min !== undefined || max !== undefined;
  const input = (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? fallback : Number(e.target.value))}
      className={cn(FIELD, "h-6 w-16 shrink-0 text-right tabular-nums")}
    />
  );
  if (!ranged) return <InlineRow label={label}>{input}</InlineRow>;
  return (
    <div>
      <InlineRow label={label}>{input}</InlineRow>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        className="block h-3 w-full accent-ring"
      />
    </div>
  );
}

export function SegmentedRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StackRow label={label}>
      <Segmented options={options} value={value} onChange={onChange} className="w-full *:flex-1" />
    </StackRow>
  );
}

export function SelectRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InlineRow label={label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={cn(FIELD, "h-6 w-36 max-w-[55%] shrink-0")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </InlineRow>
  );
}

/** "" means auto (the widget's own theme color); the native input always needs a hex. */
export function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const hasValue = value.length > 0;
  return (
    <InlineRow label={label}>
      <span className="flex shrink-0 items-center gap-1.5">
        {hasValue && (
          <button
            type="button"
            onClick={() => onChange("")}
            title="Reset to auto (the widget's theme color)"
            className="text-[11px] text-muted-foreground hover:text-foreground"
          >
            auto
          </button>
        )}
        <span className="w-14 text-right text-[11px] tabular-nums text-muted-foreground">
          {hasValue ? value : "auto"}
        </span>
        <input
          type="color"
          value={hasValue ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(
            "h-6 w-8 cursor-pointer rounded border border-border bg-transparent p-0.5",
            !hasValue && "opacity-50"
          )}
        />
      </span>
    </InlineRow>
  );
}

export function TextRow({
  label,
  value,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <StackRow label={label}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={5}
          spellCheck={false}
          placeholder=":scope { border-radius: 0 }"
          className={cn(FIELD, "w-full resize-y py-1.5 font-mono text-[11px] placeholder:text-muted-foreground/50")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className={cn(FIELD, "h-6 w-full")}
        />
      )}
    </StackRow>
  );
}
