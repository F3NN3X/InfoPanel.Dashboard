import { useSensorCatalog } from "@/lib/catalog";
import type { WidgetKind } from "@/lib/panel-model";
import { sensorAt } from "@/lib/sensors";
import { SensorPicker } from "../sensor-picker";
import { Field, NumberInput, Switch, TextInput } from "./fields";
import type { WidgetSectionProps } from "./types";

/** Kinds that show a number (unit, decimals and scale apply). */
const NUMERIC: ReadonlySet<WidgetKind> = new Set(["stat", "value", "bar", "gauge", "sparkline", "text"]);

/** Whether the widget has data fields (a shape has none). */
export const hasData = (widget: WidgetSectionProps["widget"]) => widget.kind !== "shape";

/** What the widget shows: label, bound sensor(s), static text and number format. */
export function DataFields({ widget, set }: WidgetSectionProps) {
  const catalog = useSensorCatalog();
  const missing =
    widget.sensor !== undefined &&
    catalog.status === "ready" &&
    sensorAt(catalog.sensors, widget.sensor) === undefined;
  const bindable = widget.kind !== "clock" && widget.kind !== "shape";
  const fillable = widget.kind === "bar" || widget.kind === "gauge";

  return (
    <>
      <Field label="Label">
        <TextInput value={widget.label} placeholder="…" onChange={(v) => set("label", v)} />
      </Field>

      {bindable && (
        <Field label="Sensor">
          <SensorPicker value={widget.sensor} onChange={(key) => set("sensor", key)} />
          {missing && (
            <div className="mt-1 text-[10px] text-yellow-500/80">
              not in the live sensor list — it will show “—”
            </div>
          )}
        </Field>
      )}

      {(widget.kind === "value" || widget.kind === "stat") && (
        <Field label="Sub sensor" hint="below the value">
          <SensorPicker value={widget.subSensor} onChange={(key) => set("subSensor", key)} />
        </Field>
      )}

      {(widget.kind === "text" || widget.kind === "image") && (
        <Field label={widget.kind === "image" ? "Image URL" : "Static text"}>
          <TextInput
            value={widget.text}
            placeholder={widget.kind === "image" ? "https://… (or bind a sensor with a URL)" : "text"}
            onChange={(v) => set("text", v)}
          />
        </Field>
      )}

      {NUMERIC.has(widget.kind) && (
        <div className="grid grid-cols-3 gap-2">
          <Field label="Unit">
            <TextInput value={widget.unit} placeholder="%" onChange={(v) => set("unit", v)} />
          </Field>
          <Field label="Decimals">
            <NumberInput
              value={widget.decimals ?? 0}
              min={0}
              max={6}
              fallback={0}
              className="w-full"
              onChange={(v) => set("decimals", v)}
            />
          </Field>
          <Field label="Scale ×">
            <NumberInput
              value={widget.scale}
              step="any"
              float
              optional
              fallback={1}
              placeholder="1"
              className="w-full"
              onChange={(v) => set("scale", v)}
            />
          </Field>
        </div>
      )}

      {fillable && (
        <div className="grid grid-cols-2 items-end gap-2">
          <Field label="Max (denominator)">
            <NumberInput
              value={widget.max ?? 100}
              min={0}
              float
              fallback={0}
              className="w-full"
              onChange={(v) => set("max", v)}
            />
          </Field>
          <Switch
            label="Invert fill"
            on={!!widget.inverted}
            onChange={(on) => set("inverted", on)}
            className="h-8 px-2"
          />
        </div>
      )}
    </>
  );
}
