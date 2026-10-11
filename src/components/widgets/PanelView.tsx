import type { CSSProperties } from "react";
import type { PanelDef } from "@/lib/layout";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { chromeOf } from "@/modules/standard-settings";
import { cn } from "@/lib/utils";
import { ModernChrome } from "@/components/modern-chrome";
import { flow, surfaceBox, ws } from "@/components/widget-style";
import {
  panelCardStyle,
  panelScope,
  panelSurfaceColors,
  panelSurfaceOf,
  panelVars,
} from "./panel-layout";
import { PanelOverlay } from "./panel-overlay";
import type { PanelSelection } from "./panel-parts";
import { PanelStack } from "./panel-stack";

interface PanelViewProps {
  panel: PanelDef;
  /**
   * The placement's resolved settings (own, legacy fallbacks, profile
   * style — see `panelSettings` / `withProfileStyle`): the panel's look.
   */
  settings?: ModuleSettings;
  sensors: SensorMap;
  /** Show a hint for empty panels (studio only). */
  studio?: boolean;
  /**
   * The studio's widget selection while this panel's zone is selected:
   * outlines the selected widget (and others on hover). Never in the kiosk.
   */
  selection?: PanelSelection;
}

/** Two CSS sources as one ("" when both are empty). */
const joinCss = (...parts: (string | undefined)[]) => parts.filter((p) => p?.trim()).join("\n");

/**
 * Renders a custom panel (group): an ordered list of widgets in a shared
 * background/accent scope. This is the "layer and group" unit — a panel is
 * placed on the canvas, its widgets are the individually bindable pieces.
 *
 * The look comes from the standard style settings like every widget
 * (`ModernChrome`: Size %, colors, font, custom CSS, background image;
 * the card via `surfaceBox`); the arrangement from the PanelDef.
 *
 * CSS hooks: `.wp-panel[data-panel-layout][data-panel-id]` (the card),
 * `.wp-panel-title`, `.wp-panel-bg`, `.wp-panel-scrim`, `.wp-band[data-band]`
 * and `.wp-widget.wp-widget--{kind}[data-widget-id][data-widget-kind]`.
 */
export function PanelView({ panel, settings, sensors, studio, selection }: PanelViewProps) {
  const cfg = settings ?? {};
  const title = String(cfg.label ?? (panel.titleVisible ? panel.title : ""));
  const surface = panelSurfaceOf(cfg.surface ?? panel.background);
  const chrome = chromeOf({ accent: panel.accent ?? "", ...cfg });
  const overlay = panel.layout === "overlay";
  const hug = panel.fit === "hug";
  const layout = overlay ? "overlay" : panel.layout === "grid" ? "grid" : "stack";

  const look: CSSProperties = overlay
    ? { borderRadius: ws.radius("var(--radius)") }
    : panelCardStyle(surface, chrome);

  return (
    <ModernChrome
      // The panel draws its own title; its CSS joins the panel's own (presets).
      chrome={{ ...chrome, label: "", icon: "", customCss: joinCss(chrome.customCss, panel.css) }}
    >
      <div
        className="flex h-full w-full"
        // Hug: the panel keeps its content size, placed by the zone's alignment.
        style={hug ? flow("row", { x: "start", y: "start" }) : undefined}
      >
        <div
          className={cn(
            "wp-panel relative overflow-hidden",
            hug ? "max-h-full max-w-full" : "h-full w-full",
            !overlay && "flex flex-col gap-3"
          )}
          data-panel-layout={layout}
          data-panel-id={panel.id}
          style={{ ...panelScope(chrome), ...panelVars(panel), ...look }}
        >
          {overlay ? (
            <PanelOverlay
              panel={panel}
              sensors={sensors}
              title={title}
              icon={chrome.icon}
              edge={String(surfaceBox(panelSurfaceColors(surface, chrome), chrome).boxShadow)}
              selection={selection}
              studio={studio}
            />
          ) : (
            <PanelStack
              panel={panel}
              sensors={sensors}
              title={title}
              icon={chrome.icon}
              studio={studio}
              selection={selection}
            />
          )}
        </div>
      </div>
    </ModernChrome>
  );
}
