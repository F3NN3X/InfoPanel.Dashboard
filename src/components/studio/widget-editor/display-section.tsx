import { Segmented } from "@/components/ui/segmented";
import type { Widget, WidgetKind } from "@/lib/panel-model";
import { CollapsibleSection } from "../collapsible-section";
import { Field, NumberInput, TextInput } from "./fields";
import type { WidgetSectionProps } from "./types";

/** Kinds whose text lines up left / center / right. */
const ALIGNABLE: ReadonlySet<WidgetKind> = new Set(["stat", "value", "table", "text", "clock"]);

/** Kinds with display options of their own. */
const HAS_DISPLAY: ReadonlySet<WidgetKind> = new Set([...ALIGNABLE, "image", "shape", "sparkline"]);

/** How the widget's kind presents its data (shape, rows, clock layout, …). */
export function DisplaySection({ widget, set }: WidgetSectionProps) {
  if (!HAS_DISPLAY.has(widget.kind)) return null;
  return (
    <CollapsibleSection id="panel-widget:display" title="Display" defaultOpen>
      {widget.kind === "shape" && (
        <>
          <Field label="Shape">
            <Segmented
              options={[
                { value: "vbar", label: "V-bar" },
                { value: "hbar", label: "H-bar" },
                { value: "rect", label: "Rect" },
                { value: "circle", label: "Circle" },
              ]}
              value={widget.shape ?? "vbar"}
              onChange={(v) => set("shape", v as Widget["shape"])}
            />
          </Field>
          <Field label="Thickness / diameter (px)">
            <NumberInput
              value={widget.thickness ?? 4}
              min={1}
              max={120}
              fallback={4}
              onChange={(v) => set("thickness", v)}
            />
          </Field>
        </>
      )}

      {widget.kind === "image" && (
        <Field label="Max height (px)">
          <NumberInput
            value={widget.height}
            min={24}
            max={600}
            optional
            fallback={24}
            placeholder="auto"
            onChange={(v) => set("height", v)}
          />
        </Field>
      )}

      {widget.kind === "table" && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Rows">
              <NumberInput
                value={widget.rows ?? 7}
                min={1}
                max={20}
                fallback={7}
                className="w-full"
                onChange={(v) => set("rows", v)}
              />
            </Field>
            <Field label="Columns" hint="split on “, ”">
              <NumberInput
                value={widget.columns}
                min={0}
                max={12}
                optional
                fallback={0}
                placeholder="auto"
                className="w-full"
                onChange={(v) => set("columns", v)}
              />
            </Field>
          </div>
          <Field label="Header" hint="comma-separated">
            <TextInput
              value={widget.header}
              placeholder="Date, Weather, Temp, Precip, Wind"
              onChange={(v) => set("header", v)}
            />
          </Field>
        </>
      )}

      {widget.kind === "sparkline" && (
        <Field label="History samples">
          <NumberInput
            value={widget.history ?? 40}
            min={5}
            max={200}
            fallback={40}
            onChange={(v) => set("history", v)}
          />
        </Field>
      )}

      {widget.kind === "clock" && (
        <Field label="Show">
          <Segmented
            options={[
              { value: "both", label: "Time + date" },
              { value: "time", label: "Time" },
              { value: "date", label: "Date" },
            ]}
            value={widget.clock ?? "both"}
            onChange={(v) => set("clock", v as Widget["clock"])}
          />
        </Field>
      )}

      {ALIGNABLE.has(widget.kind) && (
        <Field label="Text alignment">
          <Segmented
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
            value={widget.align ?? "left"}
            onChange={(v) => set("align", v as Widget["align"])}
          />
        </Field>
      )}
    </CollapsibleSection>
  );
}
