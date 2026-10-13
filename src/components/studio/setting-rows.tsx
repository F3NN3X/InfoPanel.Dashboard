import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { ColorPill } from "./inspector/color-pill";
import { ValueBox } from "./inspector/value-box";

/**
 * The inspector's field rows (README §4.6): the label (12.5, optional info
 * hint) with the control on its right when it is small (toggle, select,
 * colour, number), or under it when it needs the width (segmented, slider,
 * text, code, grids). `lead` is what sits before the label: the source dot.
 */

export const FIELD =
  "rounded-md border border-ui-default bg-ui-app px-[9px] text-[12.5px] text-ui-1 outline-none placeholder:text-ui-4 focus:border-ui-accent";

/** A select (README §4.6): h28, #1a1a1f, up to 170 wide. */
export const SELECT =
  "h-7 max-w-[170px] cursor-pointer rounded-md border border-ui-strong bg-ui-hover px-1.5 text-[12px] text-ui-1 outline-none focus:border-ui-accent";

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
    <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {lead}
      <span title={label} className="min-w-0 truncate text-[12.5px] text-ui-2">
        {label}
      </span>
      {hint && (
        <span title={hint} className="shrink-0 cursor-help text-ui-5 hover:text-ui-2">
          <Info className="h-3.5 w-3.5" aria-label={hint} />
        </span>
      )}
    </span>
  );
}

/** Label over a full-width control (segmented, text, lists, pickers). */
export function StackRow({ children, ...label }: RowLabelProps & { children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex min-h-[26px] items-center">
        <Label {...label} />
      </div>
      {children}
    </div>
  );
}

/** Label left, control right, one line. */
export function InlineRow({ children, ...label }: RowLabelProps & { children: ReactNode }) {
  return (
    <div className="flex min-h-[26px] items-center justify-between gap-2.5">
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
      <Toggle checked={value} onChange={onChange} label={label.label} className="[&>span]:bg-ui-1" />
    </InlineRow>
  );
}

/**
 * A number: the label with its value box (and unit) on one row and a
 * full-width slider under it when bounded, else an inline value box.
 */
export function SliderRow({
  value,
  min,
  max,
  step = 1,
  unit,
  fallback,
  onChange,
  ...label
}: RowLabelProps & {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  /** "%", "px" or "rem": shown in the value box. */
  unit?: string;
  /** Used when the input is cleared. */
  fallback: number;
  onChange: (value: number) => void;
}) {
  if (min !== undefined && max !== undefined) {
    return (
      <div className="space-y-2">
        <InlineRow {...label}>
          <ValueBox value={value} min={min} max={max} step={step} unit={unit} label={label.label} onChange={onChange} />
        </InlineRow>
        <input
          type="range"
          aria-label={label.label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
          className="m-0 block h-4 w-full cursor-pointer accent-[var(--ui-accent)]"
        />
      </div>
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
        className={cn(FIELD, "h-[26px] w-[64px] shrink-0 px-1.5 text-right font-ui-mono text-[11.5px]")}
      />
    </InlineRow>
  );
}

/** Buttons share the row: one line each, ellipsis when tight (README §4.6). */
export const SEGMENTED_CLASS =
  "w-full flex-nowrap gap-0.5 rounded-[7px] [&>button]:min-w-0 [&>button]:flex-1 [&>button]:truncate [&>button]:px-1 [&>button]:py-[5px] [&>button]:text-[11.5px] [&>button]:font-medium [&>button:not([aria-checked=true])]:text-[#8f8f99]";

export function SegmentedRow({
  options,
  value,
  onChange,
  ...label
}: RowLabelProps & {
  options: { value: string; label: string; title?: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <StackRow {...label}>
      <Segmented options={options} value={value} onChange={onChange} label={label.label} className={SEGMENTED_CLASS} />
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
        className={cn(SELECT, "min-w-0 shrink")}
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
  onReset,
  ...label
}: RowLabelProps & {
  value: string;
  onChange: (value: string) => void;
  /** A reset beside the pill, for rows without a source dot. */
  onReset?: () => void;
}) {
  return (
    <InlineRow {...label}>
      <ColorPill value={value} onChange={onChange} label={label.label} onReset={onReset} />
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
          className={cn(FIELD, "block h-24 w-full resize-y py-2 font-ui-mono text-[11.5px] leading-relaxed")}
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
