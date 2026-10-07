import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import {
  newWidget,
  type PanelDef,
  type Placement,
  type Widget,
  type WidgetKind,
} from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";

/** Fallback for color inputs when no override is set (indigo-ish). */
const COLOR_FALLBACK = "#818cf8";

const KIND_LABELS: Record<WidgetKind, string> = {
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

const ALL_KINDS = Object.keys(KIND_LABELS) as WidgetKind[];

/* ------------------------------------------------------------------ *
 * Sensor picker — searchable dropdown over the live sensor map.
 * ------------------------------------------------------------------ */

export function SensorPicker({
  sensors,
  value,
  onChange,
}: {
  sensors: SensorMap;
  value?: string;
  onChange: (key: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = value ? sensors[value] : undefined;
  const q = query.trim().toLowerCase();
  const matches = Object.entries(sensors)
    .filter(
      ([key, s]) =>
        q === "" ||
        s.name?.toLowerCase().includes(q) === true ||
        key.toLowerCase().includes(q)
    )
    .slice(0, 30);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          setQuery("");
          setOpen((o) => !o);
        }}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs",
          "hover:border-ring/50"
        )}
      >
        <span
          className={cn(
            "truncate",
            current ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {current?.name ?? value ?? "No sensor bound…"}
        </span>
        <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border p-1.5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search sensors…"
              className="w-full rounded border border-border bg-background px-1.5 py-1 text-xs text-foreground outline-none focus:border-ring"
            />
            {value && (
              <button
                onClick={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                title="Unbind sensor"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="max-h-56 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">
                no sensors match
              </div>
            ) : (
              matches.map(([key, s]) => (
                <button
                  key={key}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full px-2 py-1.5 text-left text-xs hover:bg-accent",
                    key === value && "bg-accent/60"
                  )}
                >
                  <div className="truncate text-foreground">
                    {s.name ?? key}
                  </div>
                  <div className="truncate text-[10px] text-muted-foreground">
                    {key}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Panel inspector — design + widget list + per-widget editor.
 * ------------------------------------------------------------------ */

interface PanelInspectorProps {
  placement: Placement;
  sensors: SensorMap;
  /** Mutate the placement (panel def lives on it). */
  update: (fn: (p: Placement) => Placement) => void;
}

export function PanelInspector({
  placement,
  sensors,
  update,
}: PanelInspectorProps) {
  const panel = placement.panel!;
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(
    panel.widgets[0]?.id ?? null
  );
  const selectedWidget =
    panel.widgets.find((w) => w.id === selectedWidgetId) ?? null;

  const updatePanel = (fn: (p: PanelDef) => PanelDef) =>
    update((p) => ({ ...p, panel: fn(p.panel!) }));

  const updateWidget = (id: string, fn: (w: Widget) => Widget) =>
    updatePanel((p) => ({
      ...p,
      widgets: p.widgets.map((w) => (w.id === id ? fn(w) : w)),
    }));

  const addWidget = (kind: WidgetKind) => {
    const w = newWidget(kind);
    updatePanel((p) => ({ ...p, widgets: [...p.widgets, w] }));
    setSelectedWidgetId(w.id);
  };

  const moveWidget = (id: string, dir: -1 | 1) =>
    updatePanel((p) => {
      const i = p.widgets.findIndex((w) => w.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= p.widgets.length) return p;
      const next = [...p.widgets];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...p, widgets: next };
    });

  const removeWidget = (id: string) => {
    updatePanel((p) => ({
      ...p,
      widgets: p.widgets.filter((w) => w.id !== id),
    }));
    if (selectedWidgetId === id) setSelectedWidgetId(null);
  };

  const setPanelField = <K extends keyof PanelDef>(
    key: K,
    value: PanelDef[K]
  ) => updatePanel((p) => ({ ...p, [key]: value }));

  return (
    <>
      {/* Design */}
      <div>
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Panel
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs text-muted-foreground">Title</div>
            <input
              value={panel.title}
              onChange={(e) => setPanelField("title", e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring"
            />
          </div>

          <button
            onClick={() =>
              setPanelField("titleVisible", !panel.titleVisible)
            }
            className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
          >
            <span className="text-xs text-muted-foreground">
              Show title
            </span>
            <span
              className={cn(
                "relative h-4 w-7 rounded-full transition-colors",
                panel.titleVisible
                  ? "bg-ring"
                  : "bg-muted-foreground/30"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
                  panel.titleVisible ? "left-3.5" : "left-0.5"
                )}
              />
            </span>
          </button>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">
              Background
            </div>
            <Segmented
              options={[
                { value: "none", label: "None" },
                { value: "panel", label: "Panel" },
                { value: "bordered", label: "Bordered" },
              ]}
              value={panel.background}
              onChange={(v) =>
                setPanelField(
                  "background",
                  v as PanelDef["background"]
                )
              }
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Accent</span>
              {panel.accent && (
                <button
                  onClick={() => setPanelField("accent", undefined)}
                  className="hover:text-foreground"
                >
                  Use theme
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={panel.accent ?? COLOR_FALLBACK}
                onChange={(e) =>
                  setPanelField("accent", e.target.value)
                }
                className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
              <span className="text-xs tabular-nums text-muted-foreground">
                {panel.accent ?? "theme"}
              </span>
            </div>
          </div>

          <div>
            <div className="mb-1 text-xs text-muted-foreground">Layout</div>
            <Segmented
              options={[
                { value: "wrap", label: "Flow" },
                { value: "grid", label: "Grid" },
              ]}
              value={panel.layout ?? "wrap"}
              onChange={(v) =>
                setPanelField("layout", v as PanelDef["layout"])
              }
            />
          </div>

          {(panel.layout ?? "wrap") === "grid" && (
            <div>
              <div className="mb-1 text-xs text-muted-foreground">
                Grid columns
              </div>
              <input
                type="number"
                min={1}
                max={12}
                value={panel.columns ?? 3}
                onChange={(e) =>
                  setPanelField(
                    "columns",
                    Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 3))
                  )
                }
                className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs tabular-nums text-foreground outline-none focus:border-ring"
              />
            </div>
          )}
        </div>
      </div>

      {/* Widgets */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Widgets{" "}
            <span className="normal-case text-muted-foreground/60">
              ({panel.widgets.length})
            </span>
          </div>
          <div className="flex flex-wrap justify-end gap-1">
            {ALL_KINDS.map((kind) => (
              <button
                key={kind}
                onClick={() => addWidget(kind)}
                className="flex items-center gap-0.5 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground hover:border-ring/50 hover:text-foreground"
                title={`Add ${KIND_LABELS[kind].toLowerCase()} widget`}
              >
                <Plus className="h-2.5 w-2.5" />
                {KIND_LABELS[kind]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          {panel.widgets.map((w, i) => (
            <div
              key={w.id}
              onClick={() => setSelectedWidgetId(w.id)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1.5",
                w.id === selectedWidgetId
                  ? "border-ring bg-accent/40"
                  : "border-border hover:border-ring/40",
                !w.visible && "opacity-50"
              )}
            >
              <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {KIND_LABELS[w.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate text-xs text-foreground/85">
                {w.label || w.sensor || w.text || "—"}
              </span>
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveWidget(w.id, -1);
                  }}
                  disabled={i === 0}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  title="Move up"
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    moveWidget(w.id, 1);
                  }}
                  disabled={i === panel.widgets.length - 1}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
                  title="Move down"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    updateWidget(w.id, (x) => ({
                      ...x,
                      visible: !x.visible,
                    }));
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title={w.visible ? "Hide widget" : "Show widget"}
                >
                  {w.visible ? (
                    <Eye className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOff className="h-3.5 w-3.5" />
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeWidget(w.id);
                  }}
                  className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Remove widget"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </div>
          ))}
          {panel.widgets.length === 0 && (
            <div className="rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground/60">
              no widgets yet — add one above
            </div>
          )}
        </div>
      </div>

      {/* Per-widget editor */}
      {selectedWidget && (
        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {KIND_LABELS[selectedWidget.kind]} widget
          </div>
          <WidgetEditor
            widget={selectedWidget}
            sensors={sensors}
            onChange={(fn) =>
              updateWidget(selectedWidget.id, fn)
            }
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Per-widget settings.
 * ------------------------------------------------------------------ */

function WidgetEditor({
  widget,
  sensors,
  onChange,
}: {
  widget: Widget;
  sensors: SensorMap;
  onChange: (fn: (w: Widget) => Widget) => void;
}) {
  const set = <K extends keyof Widget>(key: K, value: Widget[K]) =>
    onChange((w) => ({ ...w, [key]: value }));

  const numeric = widget.kind !== "clock" && widget.kind !== "shape";
  const fillable = widget.kind === "bar" || widget.kind === "gauge";
  const isShape = widget.kind === "shape";

  return (
    <div className="space-y-3">
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
            sensors={sensors}
            value={widget.sensor}
            onChange={(key) => set("sensor", key)}
          />
          {widget.sensor && !sensors[widget.sensor] && (
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
            sensors={sensors}
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
