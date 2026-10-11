import type { OverlayBand, PanelDef, Widget, WidgetKind } from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { cn } from "@/lib/utils";
import { justifyValue, panelGap, panelPad } from "./panel-layout";
import { PanelTitle, WidgetCell, type PanelSelection } from "./panel-parts";
import { imageSrc } from "./WidgetView";

/**
 * Full-width widgets claim their share of a band so a pair of bars
 * (network, CPU RAM) splits it 50/50.
 */
const BAND_GROW: ReadonlySet<WidgetKind> = new Set(["table", "text", "bar", "sparkline"]);

interface PanelOverlayProps {
  panel: PanelDef;
  sensors: SensorMap;
  /** Shown title ("" = none). */
  title: string;
  icon?: string;
  /** The card edge (border / glow) drawn over the art. */
  edge?: string;
  /** Studio widget selection (see `WidgetCell`). */
  selection?: PanelSelection;
  /** Studio canvas (see `WidgetCell`). */
  studio?: boolean;
}

/**
 * The body of an "overlay" panel: one image widget paints the whole panel
 * as a background; the other widgets layer on top in top / middle / bottom
 * bands (a dark scrim keeps them readable over any banner).
 */
export function PanelOverlay({ panel, sensors, title, icon, edge, selection, studio }: PanelOverlayProps) {
  const visible = panel.widgets.filter((w) => w.visible);
  const bg =
    visible.find((w) => w.kind === "image" && w.asBackground) ??
    visible.find((w) => w.kind === "image");
  const rest = visible.filter((w) => w !== bg);
  const inBand = (band: OverlayBand) => rest.filter((w) => (w.overlayZone ?? "top") === band);
  const bottom = inBand("bottom");
  const bgSrc = bg ? imageSrc(bg, sensors) : undefined;

  const band = (name: OverlayBand, items: Widget[], className: string, gap: number) => {
    if (items.length === 0) return null;
    const justify = panel.overlayAlign?.[name];
    return (
      <div
        className={cn("wp-band flex", className)}
        data-band={name}
        style={{ gap: panelGap(gap), justifyContent: justify ? justifyValue(justify) : undefined }}
      >
        {items.map((w) => (
          <WidgetCell
            key={w.id}
            widget={w}
            sensors={sensors}
            selection={selection}
            studio={studio}
            className={cn(BAND_GROW.has(w.kind) && "flex-1")}
            // In-band images (e.g. the game icon) are square — cap them at
            // their height so they sit beside text instead of stretching
            // across the whole band.
            style={
              w.kind === "image"
                ? { width: w.height ?? 48, maxWidth: w.height ?? 48, flexShrink: 0 }
                : undefined
            }
          />
        ))}
      </div>
    );
  };

  return (
    <>
      {bgSrc ? (
        <img src={bgSrc} alt={panel.title} className="wp-panel-bg absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="wp-panel-bg absolute inset-0 bg-card/60" />
      )}
      {/* Scrim — bottom-weighted so the banner shows through up top.
          Skipped for panels whose background art carries its own
          contrast (panel.scrim === false). */}
      {panel.scrim !== false && (
        <div className="wp-panel-scrim absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />
      )}
      {title && (
        <PanelTitle
          title={title}
          icon={icon}
          className="absolute right-3 top-3 z-20 rounded-full bg-black/50 px-2.5 py-1 text-foreground/90 backdrop-blur-sm"
        />
      )}
      <div
        className="relative z-10 flex h-full flex-col justify-between"
        style={{ gap: panelGap(8), padding: panelPad(12) }}
      >
        {band("top", inBand("top"), "items-center", 12)}
        {band("middle", inBand("middle"), "items-center", 16)}
        {panel.bottomGridCols && bottom.length > 0 ? (
          <div
            className="wp-band grid items-end"
            data-band="bottom"
            style={{
              gridTemplateColumns: `repeat(${panel.bottomGridCols}, minmax(0, 1fr))`,
              columnGap: panelGap(8),
            }}
          >
            {bottom.map((w) => (
              <WidgetCell
                key={w.id}
                widget={w}
                sensors={sensors}
                className="text-center"
                selection={selection}
                studio={studio}
              />
            ))}
          </div>
        ) : (
          band("bottom", bottom, "items-end", 16)
        )}
      </div>
      {edge && (
        <div className="pointer-events-none absolute inset-0 z-30" style={{ boxShadow: edge, borderRadius: "inherit" }} />
      )}
    </>
  );
}
