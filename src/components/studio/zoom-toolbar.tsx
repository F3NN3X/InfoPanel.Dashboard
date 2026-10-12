import { LayoutGrid, Maximize2, PanelBottom, PanelRight, Wand2, ZoomIn, ZoomOut, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { LayoutMode, Placement } from "./studio-layout";
import { KEYS } from "./use-studio-shortcuts";

interface ZoomToolbarProps {
  zoom: number;
  showGrid: boolean;
  onToggleGrid: () => void;
  onZoomStep: (dir: 1 | -1) => void;
  onZoomReset: () => void;
  onFit: () => void;
  /** The profile shown on the canvas (size label). */
  profile: MonitorProfile;
  /** The layout mode, where the inspector is now, and the switch. */
  layoutMode: LayoutMode;
  placement: Placement;
  onLayoutMode: (mode: LayoutMode) => void;
  /** Left end of the strip (the dock's collapse button). */
  leading?: ReactNode;
}

const LAYOUTS: { mode: LayoutMode; label: string; icon: LucideIcon }[] = [
  { mode: "auto", label: "Auto", icon: Wand2 },
  { mode: "side", label: "Side", icon: PanelRight },
  { mode: "bottom", label: "Bottom", icon: PanelBottom },
];

const ICON_BUTTON =
  "rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/**
 * The strip under the canvas (outside the page, so it never covers
 * widgets): grid toggle, zoom, fit, size and the inspector layout switch.
 */
export function ZoomToolbar({
  zoom,
  showGrid,
  onToggleGrid,
  onZoomStep,
  onZoomReset,
  onFit,
  profile,
  layoutMode,
  placement,
  onLayoutMode,
  leading,
}: ZoomToolbarProps) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-t bg-popover/40 px-2">
      {leading}
      <div className="flex min-w-0 flex-1 justify-center">
      <div className="flex items-center gap-1 rounded-full border border-border bg-popover/90 px-2 py-1">
        <button
          onClick={onToggleGrid}
          title="Toggle grid"
          className={cn(
            "rounded-full p-1.5 transition-colors hover:bg-accent",
            showGrid ? "text-foreground" : "text-muted-foreground"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <button
          onClick={() => onZoomStep(-1)}
          title={`Zoom out (${KEYS.zoomOut})`}
          className={ICON_BUTTON}
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onZoomReset}
          title="Reset to 100%"
          className="min-w-12 rounded-full px-1.5 text-center text-xs tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={() => onZoomStep(1)}
          title={`Zoom in (${KEYS.zoomIn})`}
          className={ICON_BUTTON}
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onFit}
          title={`Fit the page to the canvas and keep it fitted (${KEYS.fit})`}
          className={ICON_BUTTON}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="px-1 text-xs tabular-nums text-muted-foreground">
          {profile.width} × {profile.height}
        </span>
        <div className="h-4 w-px bg-border" />
        {LAYOUTS.map(({ mode, label, icon: Icon }) => (
          <button
            key={mode}
            onClick={() => onLayoutMode(mode)}
            aria-pressed={layoutMode === mode}
            title={`Layout: ${label}${mode === "auto" ? ` (inspector ${placement === "bottom" ? "below" : "beside"} the canvas now)` : ""}`}
            className={cn(
              "rounded-full p-1.5 transition-colors hover:bg-accent",
              layoutMode === mode ? "bg-accent text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      </div>
    </div>
  );
}
