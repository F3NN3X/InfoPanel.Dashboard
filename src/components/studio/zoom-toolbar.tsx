import {
  Grid3x3,
  LayoutPanelTop,
  Maximize2,
  Minus,
  PanelBottom,
  PanelLeft,
  PanelRight,
  Plus,
  Ruler,
  type LucideIcon,
} from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { MonitorProfile } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { LayoutMode } from "./studio-layout";
import { KEYS } from "./use-studio-shortcuts";

interface ZoomToolbarProps {
  zoom: number;
  leftOpen: boolean;
  onToggleLeft: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onZoomStep: (dir: 1 | -1) => void;
  onZoomReset: () => void;
  onFit: () => void;
  /** The profile shown on the canvas (resolution button). */
  profile: MonitorProfile;
  /** Open Dashboard › Profile. */
  onOpenProfile: () => void;
  /** The inspector position setting; the button cycles it. */
  layoutMode: LayoutMode;
  onCycleLayout: () => void;
}

const DOCK: Record<LayoutMode, { label: string; icon: LucideIcon }> = {
  side: { label: "Side", icon: PanelRight },
  bottom: { label: "Bottom", icon: PanelBottom },
  auto: { label: "Auto", icon: LayoutPanelTop },
};

const BAR_BUTTON = "h-7 w-7 rounded-md";
const TEXT_BUTTON =
  "flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-ui-3 transition-colors hover:bg-ui-hover hover:text-ui-1";

function Divider() {
  return <div className="mx-1 h-4 w-px shrink-0 bg-ui-strong" />;
}

/**
 * The floating bar over the canvas (16 px from the bottom, centred): left
 * panel, grid and ruler toggles, zoom, the resolution button and the
 * inspector position.
 */
export function ZoomToolbar({
  zoom,
  leftOpen,
  onToggleLeft,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  onZoomStep,
  onZoomReset,
  onFit,
  profile,
  onOpenProfile,
  layoutMode,
  onCycleLayout,
}: ZoomToolbarProps) {
  const dock = DOCK[layoutMode];
  const DockIcon = dock.icon;
  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 z-30 flex h-9 -translate-x-1/2 items-center gap-0.5 whitespace-nowrap px-1.5",
        "rounded-[10px] border border-ui-strong bg-ui-raised font-ui shadow-ui-float"
      )}
    >
      <IconButton label="Toggle the left panel" className={BAR_BUTTON} active={leftOpen} onClick={onToggleLeft}>
        <PanelLeft className="h-4 w-4" />
      </IconButton>
      <IconButton label="Toggle grid" className={BAR_BUTTON} active={showGrid} onClick={onToggleGrid}>
        <Grid3x3 className="h-4 w-4" />
      </IconButton>
      <IconButton label="Toggle rulers" className={BAR_BUTTON} active={showRulers} onClick={onToggleRulers}>
        <Ruler className="h-4 w-4" />
      </IconButton>
      <Divider />
      <IconButton label={`Zoom out (${KEYS.zoomOut})`} className={BAR_BUTTON} onClick={() => onZoomStep(-1)}>
        <Minus className="h-4 w-4" />
      </IconButton>
      <button
        type="button"
        onClick={onZoomReset}
        title="Reset to 100%"
        className="h-7 min-w-11 rounded-md px-1.5 text-center font-ui-mono text-xs text-ui-2 transition-colors hover:bg-ui-hover hover:text-ui-1"
      >
        {Math.round(zoom * 100)}%
      </button>
      <IconButton label={`Zoom in (${KEYS.zoomIn})`} className={BAR_BUTTON} onClick={() => onZoomStep(1)}>
        <Plus className="h-4 w-4" />
      </IconButton>
      <button
        type="button"
        onClick={onFit}
        title={`Fit the page to the canvas and keep it fitted (${KEYS.fit})`}
        className={TEXT_BUTTON}
      >
        <Maximize2 className="h-3.5 w-3.5" /> Fit
      </button>
      <Divider />
      <button
        type="button"
        onClick={onOpenProfile}
        title="Profile size, grid and spacing"
        className={cn(TEXT_BUTTON, "font-ui-mono")}
      >
        {profile.width} × {profile.height}
      </button>
      <button
        type="button"
        onClick={onCycleLayout}
        title={`Inspector position: ${dock.label} (click to change)`}
        className={TEXT_BUTTON}
      >
        <DockIcon className="h-3.5 w-3.5" /> {dock.label}
      </button>
    </div>
  );
}
