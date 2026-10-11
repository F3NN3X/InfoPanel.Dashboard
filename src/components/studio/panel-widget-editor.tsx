import { Segmented } from "@/components/ui/segmented";
import type { PanelDef, Widget, WidgetKind } from "@/lib/layout";
import { useSensorCatalog } from "@/lib/catalog";
import { sensorAt } from "@/lib/sensors";
import { cn } from "@/lib/utils";
import { SensorPicker } from "./sensor-picker";

/** Fallback for color inputs when no override is set (indigo-ish). */
export const COLOR_FALLBACK = "#818cf8";

export const KIND_LABELS: Record<WidgetKind, string> = {
  stat: "Stat",
  value: "Value",
  bar: "Bar",
  gauge: "Gauge",
  sparkline: "Sparkline",
  table: "Table",
  text: "Text",
  image: "Image",
  clock: "Clock",
  shape: "Shape",
};

export const ALL_KINDS = Object.keys(KIND_LABELS) as WidgetKind[];

/* ------------------------------------------------------------------ *
 * Per-widget settings.
 * ------------------------------------------------------------------ */

export function WidgetEditor({
  widget,
  panelLayout,
  onChange,
}: {
  widget: Widget;
  panelLayout?: PanelDef["layout"];
  onChange: (fn: (w: Widget) => Widget) => void;
}) {
  const set = <K extends keyof Widget>(key: K, value: Widget[K]) =>
    onChange((w) => ({ ...w, [key]: value }));
  const catalog = useSensorCatalog();
  const missing =
    widget.sensor !== undefined &&
    catalog.status === "ready" &&
    sensorAt(catalog.sensors, widget.sensor) === undefined;

  const numeric = widget.kind !== "clock" && widget.kind !== "shape";
  const fillable = widget.kind === "bar" || widget.kind === "gauge";
  const isShape = widget.kind === "shape";
  const isOverlay = panelLayout === "overlay";

  return (
    <div className="space-y-3">
      {isOverlay && (
        <div className="rounded-md border border-border bg-background/60 p-2 space-y-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Overlay placement
          </div>
          {widget.kind === "image" && (
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={!!widget.asBackground}
                onChange={(e) =>
                  set("asBackground", e.target.checked || undefined)
                }
                className="h-3.5 w-3.5 accent-ring"
              />
              Use as panel background
            </label>
          )}
          <div className="flex items-center gap-2">
            <span className="w-14 shrink-0 text-xs text-muted-foreground">
              Zone
            </span>
            <Segmented
              options={[
                { value: "top", label: "Top" },
                { value: "middle", label: "Middle" },
                { value: "bottom", label: "Bottom" },
              ]}
              value={widget.overlayZone ?? "top"}
              onChange={(v) =>
                set("overlayZone", v as Widget["overlayZone"])
              }
            />
          </div>
        </div>
      )}
      {!isShape && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Label</div>
          <input
            value={widget.label ?? ""}
            placeholder="…"
            onChange={(e) => set("label", e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
          />
        </div>
      )}

      {numeric && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Sensor</div>
          <SensorPicker
            value={widget.sensor}
            onChange={(key) => set("sensor", key)}
          />
          {missing && (
            <div className="mt-1 text-[10px] text-yellow-500/80">
              not in the live sensor list — it will show “—”
            </div>
          )}
        </div>
      )}

      {(widget.kind === "value" || widget.kind === "stat") && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            Sub sensor <span className="text-muted-foreground/60">(below the value)</span>
          </div>
          <SensorPicker
            value={widget.subSensor}
            onChange={(key) => set("subSensor", key)}
          />
        </div>
      )}

      {(widget.kind === "text" || widget.kind === "image") && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            {widget.kind === "image" ? "Image URL" : "Static text"}
          </div>
          <input
            value={widget.text ?? ""}
            placeholder={
              widget.kind === "image"
                ? "https://… (or bind a sensor with a URL)"
                : "text"
            }
            onChange={(e) => set("text", e.target.value || undefined)}
            className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
          />
        </div>
      )}

      {widget.kind === "image" && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            Max height (px)
          </div>
          <input
            type="number"
            min={24}
            max={600}
            value={widget.height ?? ""}
            placeholder="auto"
            onChange={(e) =>
              set(
                "height",
                e.target.value === ""
                  ? undefined
                  : Math.max(
                      24,
                      Math.min(600, parseInt(e.target.value, 10) || 24)
                    )
              )
            }
            className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
          />
        </div>
      )}

      {!isShape && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Unit</div>
            <input
              value={widget.unit ?? ""}
              placeholder="%"
              onChange={(e) => set("unit", e.target.value || undefined)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Decimals</div>
            <input
              type="number"
              min={0}
              max={6}
              value={widget.decimals ?? 0}
              onChange={(e) =>
                set("decimals", Math.max(0, parseInt(e.target.value, 10) || 0))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
        </div>
      )}

      <div>
        <div className="mb-1 text-xs text-muted-foreground">Layout & size</div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">
              Font size (px)
            </div>
            <input
              type="number"
              min={8}
              max={200}
              value={widget.fontSize ?? ""}
              placeholder="auto"
              onChange={(e) =>
                set(
                  "fontSize",
                  e.target.value === ""
                    ? undefined
                    : Math.max(
                        8,
                        Math.min(200, parseInt(e.target.value, 10) || 0)
                      )
                )
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">
              Alignment
            </div>
            <Segmented
              options={[
                { value: "left", label: "L" },
                { value: "center", label: "C" },
                { value: "right", label: "R" },
              ]}
              value={widget.align ?? "left"}
              onChange={(v) => set("align", v as Widget["align"])}
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">
              Col span (grid)
            </div>
            <input
              type="number"
              min={0}
              max={12}
              value={widget.span ?? ""}
              placeholder="auto"
              onChange={(e) =>
                set(
                  "span",
                  e.target.value === ""
                    ? undefined
                    : Math.max(
                        1,
                        Math.min(12, parseInt(e.target.value, 10) || 1)
                      )
                )
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <div className="mb-1 text-[10px] text-muted-foreground">
              Row span (grid)
            </div>
            <input
              type="number"
              min={0}
              max={12}
              value={widget.rowSpan ?? ""}
              placeholder="auto"
              onChange={(e) =>
                set(
                  "rowSpan",
                  e.target.value === ""
                    ? undefined
                    : Math.max(
                        1,
                        Math.min(12, parseInt(e.target.value, 10) || 1)
                      )
                )
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
        </div>
      </div>

      {isShape && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Shape</div>
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
          <div className="mt-2">
            <div className="mb-1 text-xs text-muted-foreground">
              Thickness / diameter (px)
            </div>
            <input
              type="number"
              min={1}
              max={120}
              value={widget.thickness ?? 4}
              onChange={(e) =>
                set(
                  "thickness",
                  Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 4))
                )
              }
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
        </div>
      )}

      {fillable && (
        <div className="grid grid-cols-2 items-end gap-2">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              Max (denominator)
            </div>
            <input
              type="number"
              min={0}
              value={widget.max ?? 100}
              onChange={(e) =>
                set("max", Math.max(0, parseFloat(e.target.value) || 0))
              }
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
          <button
            onClick={() => set("inverted", !widget.inverted)}
            className="flex h-8 items-center justify-between rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-accent/40"
          >
            Invert fill
            <span
              className={cn(
                "relative h-4 w-7 rounded-full transition-colors",
                widget.inverted
                  ? "bg-ring"
                  : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
                  widget.inverted ? "left-3.5" : "left-0.5"
                )}
              />
            </span>
          </button>
        </div>
      )}

      {widget.kind === "table" && (
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Rows</div>
            <input
              type="number"
              min={1}
              max={20}
              value={widget.rows ?? 7}
              onChange={(e) =>
                set(
                  "rows",
                  Math.max(1, Math.min(20, parseInt(e.target.value, 10) || 7))
                )
              }
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              Columns <span className="text-muted-foreground/60">(split lines on “, ”)</span>
            </div>
            <input
              type="number"
              min={0}
              max={12}
              value={widget.columns ?? ""}
              placeholder="auto"
              onChange={(e) =>
                set(
                  "columns",
                  e.target.value === ""
                    ? undefined
                    : Math.max(
                        0,
                        Math.min(12, parseInt(e.target.value, 10) || 0)
                      )
                )
              }
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              Header <span className="text-muted-foreground/60">(comma-separated)</span>
            </div>
            <input
              value={widget.header ?? ""}
              placeholder="Date, Weather, Temp, Precip, Wind"
              onChange={(e) => set("header", e.target.value || undefined)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            />
          </div>
        </div>
      )}

      {widget.kind === "sparkline" && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">
            History samples
          </div>
          <input
            type="number"
            min={5}
            max={200}
            value={widget.history ?? 40}
            onChange={(e) =>
              set(
                "history",
                Math.max(
                  5,
                  Math.min(200, parseInt(e.target.value, 10) || 40)
                )
              )
            }
            className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
          />
        </div>
      )}

      {widget.kind === "clock" && (
        <div>
          <div className="mb-1 text-xs text-muted-foreground">Layout</div>
          <Segmented
            options={[
              { value: "both", label: "Time + date" },
              { value: "time", label: "Time" },
              { value: "date", label: "Date" },
            ]}
            value={widget.clock ?? "both"}
            onChange={(v) =>
              set("clock", v as Widget["clock"])
            }
          />
        </div>
      )}

      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Color</span>
          {widget.color && (
            <button
              onClick={() => set("color", undefined)}
              className="hover:text-foreground"
            >
              Use theme
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={widget.color ?? COLOR_FALLBACK}
            onChange={(e) => set("color", e.target.value)}
            className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {widget.color ?? "theme"}
          </span>
        </div>
      </div>
    </div>
  );
}
