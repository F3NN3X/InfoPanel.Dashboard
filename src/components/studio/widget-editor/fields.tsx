import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ColorRow, FIELD, InlineRow, StackRow, ToggleRow } from "../setting-rows";

/* Small labelled inputs shared by the panel and widget editors, on the inspector's row components. */

export const INPUT = cn(FIELD, "h-7 w-full");

/** A label (with an info hint) over its control: the inspector's stacked row. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="break-inside-avoid">
      <StackRow label={label} hint={hint}>
        {children}
      </StackRow>
    </div>
  );
}

/** A label left and a small control right (numbers, selects): the inspector's inline row. */
export function InlineField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <InlineRow label={label} hint={hint}>
      {children}
    </InlineRow>
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
      className={cn(INPUT, mono && "font-ui-mono text-[11.5px]")}
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
      className={cn(INPUT, "text-right font-ui-mono text-[11.5px]", className ?? "w-24")}
    />
  );
}

/** A labelled on/off switch row (the same row as the inspector's toggles). */
export function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
  className?: string;
}) {
  return <ToggleRow label={label} value={on} onChange={onChange} />;
}

/** A color override (`undefined` = theme), one line like the inspector's color rows. */
export function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
}) {
  return <ColorRow label={label} value={value ?? ""} onChange={(v) => onChange(v || undefined)} />;
}
