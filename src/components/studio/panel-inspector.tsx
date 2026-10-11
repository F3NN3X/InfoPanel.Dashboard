import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { Segmented } from "@/components/ui/segmented";
import {
  newWidget,
  type PanelDef,
  type Placement,
  type Widget,
  type WidgetKind,
} from "@/lib/layout";
import { cn } from "@/lib/utils";
import {
  ALL_KINDS,
  COLOR_FALLBACK,
  KIND_LABELS,
  WidgetEditor,
} from "./panel-widget-editor";

/* ------------------------------------------------------------------ *
 * Panel inspector — design + widget list + per-widget editor.
 * ------------------------------------------------------------------ */

interface PanelInspectorProps {
  placement: Placement;
  /** Mutate the placement (panel def lives on it). */
  update: (fn: (p: Placement) => Placement) => void;
}

export function PanelInspector({
  placement,
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
                { value: "overlay", label: "Overlay" },
              ]}
              value={panel.layout ?? "wrap"}
              onChange={(v) =>
                setPanelField("layout", v as PanelDef["layout"])
              }
            />
            {(panel.layout ?? "wrap") === "overlay" && (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground/70">
                The first "As background" image fills the panel; the other
                widgets layer on top in the Top / Middle / Bottom zones.
              </p>
            )}
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
            panelLayout={panel.layout}
            onChange={(fn) =>
              updateWidget(selectedWidget.id, fn)
            }
          />
        </div>
      )}
    </>
  );
}
