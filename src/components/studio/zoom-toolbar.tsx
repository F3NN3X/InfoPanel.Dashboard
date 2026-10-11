import {
  LayoutGrid,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";
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
}

const ICON_BUTTON =
  "rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

/** Floating pill under the canvas: grid toggle, zoom, fit, size. */
export function ZoomToolbar({
  zoom,
  showGrid,
  onToggleGrid,
  onZoomStep,
  onZoomReset,
  onFit,
  profile,
}: ZoomToolbarProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-30 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-popover/90 px-2 py-1.5 shadow-lg backdrop-blur">
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
          title={`Fit design width to viewport (${KEYS.fit})`}
          className={ICON_BUTTON}
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <div className="h-4 w-px bg-border" />
        <span className="px-1 text-xs tabular-nums text-muted-foreground">
          {profile.width} × {profile.height}
        </span>
      </div>
    </div>
  );
}
