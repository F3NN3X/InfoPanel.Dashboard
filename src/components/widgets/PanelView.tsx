import { type CSSProperties } from "react";
import { hexToHsl } from "@/lib/theme";
import type { PanelDef, WidgetKind } from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import { WidgetView } from "./WidgetView";

/** Kinds that want a full row of the panel (everything else flows inline). */
const FULL_ROW: ReadonlySet<WidgetKind> = new Set([
  "bar",
  "table",
  "image",
  "sparkline",
]);

interface PanelViewProps {
  panel: PanelDef;
  sensors: SensorMap;
  /** Show a hint for empty panels (studio only). */
  studio?: boolean;
}

/**
 * Renders a custom panel (group): an ordered list of widgets in a shared
 * background/accent scope. This is the "layer and group" unit — a panel is
 * placed on the canvas, its widgets are the individually bindable pieces.
 */
export function PanelView({ panel, sensors, studio }: PanelViewProps) {
  const visible = panel.widgets.filter((w) => w.visible);
  const scope = panel.accent
    ? ({ "--accent": hexToHsl(panel.accent) } as CSSProperties)
    : undefined;

  const body = (
    <div className="space-y-3">
      {panel.titleVisible && (
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={
              panel.accent
                ? { backgroundColor: panel.accent }
                : { backgroundColor: "hsl(var(--accent))" }
            }
          />
          {panel.title}
        </div>
      )}
      {visible.length === 0 ? (
        studio ? (
          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground/60">
            empty panel — add widgets in the inspector
          </div>
        ) : (
          <div className="h-4" />
        )
      ) : (
        <div className="flex flex-wrap items-start gap-x-5 gap-y-3">
          {visible.map((w) => (
            <div
              key={w.id}
              className={cn(
                "min-w-0",
                FULL_ROW.has(w.kind) ? "flex-1 basis-full" : "shrink-0"
              )}
            >
              <WidgetView widget={w} sensors={sensors} />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={scope}>
      {panel.background === "panel" ? (
        <div className="rounded-lg bg-card/50 p-3">{body}</div>
      ) : panel.background === "bordered" ? (
        <div className="rounded-lg border border-border bg-card/30 p-3">
          {body}
        </div>
      ) : (
        <div className="p-1">{body}</div>
      )}
    </div>
  );
}
