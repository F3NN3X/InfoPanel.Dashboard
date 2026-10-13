import type { WidgetKind } from "@/lib/panel-model";
import { Field, InlineField, NumberInput, TextInput } from "./fields";
import { SensorField } from "./sensor-field";
import type { WidgetSectionProps } from "./types";

/** Kinds that show a number (unit, decimals and scale apply). */
const NUMERIC: ReadonlySet<WidgetKind> = new Set(["stat", "value", "bar", "gauge", "sparkline", "text"]);

/** Whether the widget has data fields (a shape has none). */
export const hasData = (widget: WidgetSectionProps["widget"]) => widget.kind !== "shape";

/** What the widget shows (the Display card): label, bound sensor(s) and number format. */
export function DataFields({ widget, set, onOpenExplorer }: WidgetSectionProps) {
  const bindable = widget.kind !== "clock" && widget.kind !== "shape";

  return (
    <>
      <Field label="Label">
        <TextInput value={widget.label} placeholder="…" onChange={(v) => set("label", v)} />
      </Field>

      {bindable && (
        <SensorField
          label="Sensor"
          value={widget.sensor}
          onChange={(key) => set("sensor", key)}
          onOpenExplorer={onOpenExplorer}
        />
      )}

      {(widget.kind === "value" || widget.kind === "stat") && (
        <SensorField
          label="Sub sensor"
          hint="below the value"
          value={widget.subSensor}
          onChange={(key) => set("subSensor", key)}
          onOpenExplorer={onOpenExplorer}
        />
      )}

      {NUMERIC.has(widget.kind) && (
        <>
          <Field label="Unit">
            <TextInput value={widget.unit} placeholder="%" onChange={(v) => set("unit", v)} />
          </Field>
          <InlineField label="Decimals">
            <NumberInput
              value={widget.decimals ?? 0}
              min={0}
              max={6}
              fallback={0}
              onChange={(v) => set("decimals", v)}
            />
          </InlineField>
          <InlineField label="Scale ×">
            <NumberInput
              value={widget.scale}
              step="any"
              float
              optional
              fallback={1}
              placeholder="1"
              onChange={(v) => set("scale", v)}
            />
          </InlineField>
        </>
      )}
    </>
  );
}
