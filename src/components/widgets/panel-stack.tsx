import type { PanelDef } from "@/lib/layout";
import type { SensorMap } from "@/modules/types";
import { panelLayoutStyle, widgetBoxStyle } from "./panel-layout";
import { PanelTitle, WidgetCell, type PanelSelection } from "./panel-parts";

interface PanelStackProps {
  panel: PanelDef;
  sensors: SensorMap;
  /** Shown title ("" = none). */
  title: string;
  icon?: string;
  /** Show a hint for empty panels (studio only). */
  studio?: boolean;
  /** Studio widget selection (see `WidgetCell`). */
  selection?: PanelSelection;
}

/**
 * The body of a "stack" or "grid" panel: the title line, then the widgets
 * in a flex stack (row / column, wrapping) or a CSS grid.
 */
export function PanelStack({ panel, sensors, title, icon, studio, selection }: PanelStackProps) {
  const visible = panel.widgets.filter((w) => w.visible);
  return (
    <>
      {title && <PanelTitle title={title} icon={icon} className="text-muted-foreground" />}
      {visible.length === 0 ? (
        studio ? (
          <div className="flex min-h-20 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground/60">
            empty panel — add widgets in the inspector
          </div>
        ) : (
          <div className="h-4" />
        )
      ) : (
        <div className="min-h-0 flex-1" style={panelLayoutStyle(panel)}>
          {visible.map((w) => (
            <WidgetCell
              key={w.id}
              widget={w}
              sensors={sensors}
              style={widgetBoxStyle(w, panel)}
              selection={selection}
              studio={studio}
            />
          ))}
        </div>
      )}
    </>
  );
}
