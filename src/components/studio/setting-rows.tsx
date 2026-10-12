import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { ColorField } from "@/components/ui/color-field";
import { Segmented } from "@/components/ui/segmented";
import { SliderField } from "@/components/ui/slider-field";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";

/**
 * The inspector's field rows (README §4.6): the label (12.5, optional info
 * hint) with the control on its right when it is small (toggle, select,
 * colour, number), or under it when it needs the width (segmented, slider,
 * text, code, grids). `lead` is what sits before the label: the source dot.
 */

export const FIELD =
  "rounded-md border border-ui-default bg-ui-app px-2 text-[12px] text-ui-1 outline-none placeholder:text-ui-5 focus:border-ui-accent";

export interface RowLabelProps {
  label: string;
  /** Before the label (the source dot). */
  lead?: ReactNode;
  /** One-line explanation behind an info icon. */
  hint?: string;
}

/** The label of a row (truncated to one line, full text on hover). */
function Label({ label, lead, hint, className }: RowLabelProps & { className?: string }) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2", className)}>
      {lead}
      <span title={label} className="min-w-0 truncate text-[12.5px] text-ui-2">
        {label}
      </span>
      {hint && (
        <span title={hint} className="shrink-0 text-ui-5 hover:text-ui-2">
          <Info className="h-3.5 w-3.5" aria-label={hint} />
        </span>
      )}
    </span>
  );
}

/** Label over a full-width control (segmented, text, lists, pickers). */
export function StackRow({ children, ...label }: RowLabelProps & { children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex min-h-5 items-center">
        <Label {...label} />
      </div>
      {children}
    </div>
  );
}

/** Label left, control right, one line. */
export function InlineRow({ children, ...label }: RowLabelProps & { children: ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <Label {...label} className="flex-1" />
      {children}
    </div>
  );
}

export function ToggleRow({
  value,
  onChange,
  ...label
}: RowLabelProps & { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <InlineRow {...label}>
      <Toggle checked={value} onChange={onChange} label={label.label} />
    </InlineRow>
  );
}

/** A number: a slider with its value box under the label when bounded, else an inline value box. */
export function SliderRow({
  value,
  min,
  max,
  step,
  fallback,
  onChange,
  ...label
}: RowLabelProps & {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** Used when the input is cleared. */
  fallback: number;
  onChange: (value: number) => void;
}) {
  if (min !== undefined && max !== undefined) {
    return (
      <StackRow {...label}>
        <SliderField value={value} min={min} max={max} step={step} label={label.label} onChange={onChange} />
      </StackRow>
    );
  }
  return (
    <InlineRow {...label}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label.label}
        onChange={(e) => onChange(e.target.value === "" ? fallback : Number(e.target.value))}
        className={cn(FIELD, "h-[26px] w-[64px] shrink-0 text-right font-ui-mono text-[11.5px]")}
      />
    </InlineRow>
  );
}

export function SegmentedRow({
  options,
  value,
  onChange,
  ...label
}: RowLabelProps & {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StackRow {...label}>
      <Segmented options={options} value={value} onChange={onChange} label={label.label} className="w-full *:flex-1" />
    </StackRow>
  );
}

export function SelectRow({
  options,
  value,
  onChange,
  ...label
}: RowLabelProps & {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <InlineRow {...label}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label.label}
        className={cn(FIELD, "h-7 w-36 max-w-[55%] shrink-0 bg-ui-hover")}
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

/** "" means Auto (the widget's own theme color). */
export function ColorRow({
  value,
  onChange,
  ...label
}: RowLabelProps & { value: string; onChange: (value: string) => void }) {
  return (
    <InlineRow {...label}>
      <ColorField value={value} onChange={onChange} label={label.label} />
    </InlineRow>
  );
}

export function TextRow({
  value,
  multiline,
  placeholder,
  onChange,
  ...label
}: RowLabelProps & {
  value: string;
  /** A code area (mono, 96 high): custom CSS. */
  multiline?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <StackRow {...label}>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          aria-label={label.label}
          placeholder={placeholder ?? ":scope { border-radius: 0 }"}
          className={cn(FIELD, "block h-24 w-full resize-y py-1.5 font-ui-mono text-[11.5px] leading-relaxed")}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label.label}
          placeholder={placeholder}
          className={cn(FIELD, "h-[30px] w-full")}
        />
      )}
    </StackRow>
  );
}
