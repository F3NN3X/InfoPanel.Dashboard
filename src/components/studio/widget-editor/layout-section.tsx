import { Segmented } from "@/components/ui/segmented";
import {
  defaultBoxW,
  type BoxAlign,
  type BoxSize,
  type OverlayBand,
  type PanelDef,
  type WidgetBox,
} from "@/lib/panel-model";
import { AlignGrid } from "../align-grid";
import { CollapsibleSection } from "../collapsible-section";
import { Field, NumberInput, Switch } from "./fields";
import type { WidgetSectionProps } from "./types";

type SizeMode = "hug" | "fill" | "fixed";

/** Px a size gets when switched to Fixed. */
const FIXED_PX = 120;

/** A box without its unset fields (`undefined` when nothing is left). */
function cleanBox(box: WidgetBox): WidgetBox | undefined {
  const rest = Object.entries(box).filter(([, v]) => v !== undefined);
  return rest.length > 0 ? (Object.fromEntries(rest) as WidgetBox) : undefined;
}

/** Hug / Fill / Fixed + px for one axis of a stack widget ("Auto" / Fixed in a grid). */
function SizeField({
  label,
  value,
  fallback,
  grid,
  onChange,
}: {
  label: string;
  value: BoxSize | undefined;
  fallback: BoxSize;
  grid: boolean;
  onChange: (value: BoxSize | undefined) => void;
}) {
  const current = value ?? fallback;
  const mode: SizeMode = typeof current === "number" ? "fixed" : current;
  const options = grid
    ? [
        { value: "fill" as const, label: "Cell", title: "Fill the grid cell" },
        { value: "fixed" as const, label: "Fixed" },
      ]
    : [
        { value: "hug" as const, label: "Hug", title: "Fit the content" },
        { value: "fill" as const, label: "Fill", title: "Take the free space" },
        { value: "fixed" as const, label: "Fixed" },
      ];
  return (
    <Field label={label}>
      <div className="flex items-center gap-1.5">
        <Segmented
          options={options}
          value={grid && mode === "hug" ? "fill" : mode}
          onChange={(m) => onChange(m === "fixed" ? FIXED_PX : m === fallback ? undefined : m)}
        />
        {typeof current === "number" && (
          <NumberInput
            value={current}
            min={1}
            max={4000}
            fallback={FIXED_PX}
            className="w-16"
            onChange={(v) => onChange(v)}
          />
        )}
      </div>
    </Field>
  );
}

/** The widget's own placement: AlignGrid on the panel's cross axis. */
function SelfAlign({
  panel,
  value,
  onChange,
}: {
  panel: PanelDef;
  value: BoxAlign | undefined;
  onChange: (value: BoxAlign | undefined) => void;
}) {
  // Stack rows and grids place a widget vertically; column stacks horizontally.
  const axis = panel.layout === "stack" && panel.direction === "column" ? "x" : "y";
  return (
    <Field label="Align self" hint={axis === "x" ? "horizontal" : "vertical"}>
      <AlignGrid
        label="Align self"
        only={axis}
        stretch={axis}
        x={axis === "x" ? value : undefined}
        y={axis === "y" ? value : undefined}
        onChange={(x, y) => onChange((axis === "x" ? x : y) as BoxAlign | undefined)}
      />
    </Field>
  );
}

/**
 * Where the widget sits in its panel: size and own alignment in a stack /
 * grid, span and cell in a grid, the band (and background) in an overlay.
 */
export function LayoutSection({ widget, panel, set, onChange }: WidgetSectionProps) {
  const layout = panel.layout === "wrap" || !panel.layout ? "stack" : panel.layout;
  const grid = layout === "grid";
  const box = widget.box ?? {};
  const setBox = <K extends keyof WidgetBox>(key: K, value: WidgetBox[K]) =>
    onChange((w) => ({ ...w, box: cleanBox({ ...w.box, [key]: value }) }), `box.${key}`);
  const optional = (key: "span" | "rowSpan") => (
    <NumberInput
      value={widget[key]}
      min={1}
      max={12}
      optional
      fallback={1}
      placeholder="auto"
      className="w-full"
      onChange={(v) => set(key, v)}
    />
  );
  const cell = (key: "col" | "row") => (
    <NumberInput
      value={box[key]}
      min={1}
      max={24}
      optional
      fallback={1}
      placeholder="auto"
      className="w-full"
      onChange={(v) => setBox(key, v)}
    />
  );

  return (
    <CollapsibleSection id="panel-widget:layout" title="Layout" defaultOpen>
      {layout === "overlay" ? (
        <>
          {widget.kind === "image" && (
            <Switch
              label="Use as panel background"
              on={!!widget.asBackground}
              onChange={(on) => set("asBackground", on || undefined)}
            />
          )}
          <Field label="Band">
            <Segmented
              options={[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
              value={widget.overlayZone ?? "top"}
              onChange={(v) => set("overlayZone", v as OverlayBand)}
            />
          </Field>
        </>
      ) : (
        <>
          <SizeField
            label="Width"
            value={box.w}
            fallback={grid ? "fill" : defaultBoxW(widget.kind)}
            grid={grid}
            onChange={(v) => setBox("w", v)}
          />
          <SizeField
            label="Height"
            value={box.h}
            fallback={grid ? "fill" : "hug"}
            grid={grid}
            onChange={(v) => setBox("h", v)}
          />
          <SelfAlign panel={panel} value={box.self} onChange={(v) => setBox("self", v)} />
          {grid && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Column span">{optional("span")}</Field>
              <Field label="Row span">{optional("rowSpan")}</Field>
              <Field label="Column" hint="start">{cell("col")}</Field>
              <Field label="Row" hint="start">{cell("row")}</Field>
            </div>
          )}
        </>
      )}
    </CollapsibleSection>
  );
}
