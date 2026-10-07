import { type CSSProperties } from "react";
import { hexToHsl } from "@/lib/theme";
import type { PanelDef, Widget, WidgetKind } from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import { WidgetView, imageSrc } from "./WidgetView";

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
  const isGrid = panel.layout === "grid";
  const cols = panel.columns ?? 3;

  const widgets =
    visible.length === 0 ? null : isGrid ? (
      <div
        className="grid gap-x-4 gap-y-3"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {visible.map((w) => (
          <div
            key={w.id}
            className="min-w-0"
            style={{
              gridColumn: w.span ? `span ${Math.min(w.span, cols)}` : undefined,
              gridRow: w.rowSpan ? `span ${w.rowSpan}` : undefined,
            }}
          >
            <WidgetView widget={w} sensors={sensors} />
          </div>
        ))}
      </div>
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
    );

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
        widgets
      )}
    </div>
  );

  // — Overlay layout: one image widget paints the whole panel as a
  //   background; the other widgets layer on top in top / middle / bottom
  //   zones (a dark scrim keeps them readable over any banner).
  if (panel.layout === "overlay") {
    const bg =
      visible.find((w) => w.kind === "image" && w.asBackground) ??
      visible.find((w) => w.kind === "image");
    const rest = visible.filter((w) => w !== bg);
    const zone = (w: Widget) => w.overlayZone ?? "top";
    const top = rest.filter((w) => zone(w) === "top");
    const middle = rest.filter((w) => zone(w) === "middle");
    const bottom = rest.filter((w) => zone(w) === "bottom");
    const bgSrc = bg ? imageSrc(bg, sensors) : undefined;

    const zoneRow = (items: Widget[], className: string) =>
      items.length === 0 ? null : (
        <div className={className}>
          {items.map((w) => (
            <div
              key={w.id}
              className={cn(
                "min-w-0",
                (w.kind === "table" || w.kind === "text") && "flex-1"
              )}
              style={
                // In-zone images (e.g. the game icon) are square — cap them
                // at their height so they sit beside text instead of
                // stretching across the whole zone.
                w.kind === "image"
                  ? {
                      width: w.height ?? 48,
                      maxWidth: w.height ?? 48,
                      flexShrink: 0,
                    }
                  : undefined
              }
            >
              <WidgetView widget={w} sensors={sensors} />
            </div>
          ))}
        </div>
      );

    return (
      <div className="relative h-full overflow-hidden rounded-lg" style={scope}>
        {bgSrc ? (
          <img
            src={bgSrc}
            alt={panel.title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-card/60" />
        )}
        {/* Scrim — bottom-weighted so the banner shows through up top.
            Skipped for panels whose background art carries its own
            contrast (panel.scrim === false). */}
        {panel.scrim !== false && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
        )}
        {panel.titleVisible && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-foreground/90 backdrop-blur-sm">
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
        <div className="relative z-10 flex h-full flex-col justify-between gap-2 p-3 pr-3">
          {zoneRow(top, "flex items-center gap-3")}
          {zoneRow(middle, "flex items-center gap-4")}
          {panel.bottomGridCols && bottom.length > 0 ? (
            <div
              className="grid items-end gap-x-2"
              style={{
                gridTemplateColumns: `repeat(${panel.bottomGridCols}, minmax(0, 1fr))`,
              }}
            >
              {bottom.map((w) => (
                <div key={w.id} className="min-w-0 text-center">
                  <WidgetView widget={w} sensors={sensors} />
                </div>
              ))}
            </div>
          ) : (
            zoneRow(bottom, "flex items-end gap-4")
          )}
        </div>
      </div>
    );
  }

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
