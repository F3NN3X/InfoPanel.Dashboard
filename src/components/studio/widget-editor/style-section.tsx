import type { WidgetKind } from "@/lib/panel-model";
import { ColorInput, Field, INPUT, NumberInput, TextInput } from "./fields";
import type { WidgetSectionProps } from "./types";

/** Kinds that read `fontSize` (a gauge's ring diameter). */
const SIZED: ReadonlySet<WidgetKind> = new Set(["stat", "value", "gauge", "table", "text", "clock"]);

/** Kinds that read `color`. */
const COLORED: ReadonlySet<WidgetKind> = new Set([
  "stat",
  "value",
  "bar",
  "gauge",
  "sparkline",
  "text",
  "clock",
  "shape",
]);

/** The class / data hooks a widget's CSS can target (see `WidgetCell`). */
const HOOKS = [
  [":scope", "this widget's cell"],
  [".wp-label", "label"],
  [".wp-value", "value"],
  [".wp-unit", "unit"],
  [".wp-bar-fill", "bar fill"],
] as const;

/** Whether the kind reads `fontSize`. */
export const hasTypography = (widget: WidgetSectionProps["widget"]) => SIZED.has(widget.kind);

/** Whether the kind reads `color`. */
export const hasColor = (widget: WidgetSectionProps["widget"]) => COLORED.has(widget.kind);

/** Font size (a gauge's ring size). */
export function TypographyFields({ widget, set }: WidgetSectionProps) {
  return (
    <Field label={widget.kind === "gauge" ? "Ring size (px)" : "Font size (px)"}>
      <NumberInput
        value={widget.fontSize}
        min={8}
        max={200}
        optional
        fallback={8}
        placeholder="auto"
        onChange={(v) => set("fontSize", v)}
      />
    </Field>
  );
}

/** The widget's color override. */
export function ColorFields({ widget, set }: WidgetSectionProps) {
  return <ColorInput label="Color" value={widget.color} onChange={(v) => set("color", v)} />;
}

/** Extra class names and the widget's own CSS, with the hooks it can target. */
export function AdvancedFields({ widget, set }: WidgetSectionProps) {
  return (
    <>
      <Field label="Class names" hint="hooks for panel CSS">
        <TextInput value={widget.className} placeholder="big accent" mono onChange={(v) => set("className", v)} />
      </Field>
      <Field label="Custom CSS" hint="scoped to this widget">
        <textarea
          value={widget.css ?? ""}
          onChange={(e) => set("css", e.target.value || undefined)}
          rows={4}
          spellCheck={false}
          placeholder=":scope .wp-value { color: tomato }"
          className={`${INPUT} resize-y font-mono text-[11px] placeholder:text-muted-foreground/50`}
        />
        <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-2 text-[10px] text-muted-foreground/70">
          {HOOKS.map(([hook, what]) => (
            <div key={hook} className="contents">
              <dt className="font-mono">{hook}</dt>
              <dd>{what}</dd>
            </div>
          ))}
        </dl>
      </Field>
    </>
  );
}
