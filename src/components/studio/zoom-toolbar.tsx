import { Grid3x3, Minus, PanelBottom, PanelLeftClose, PanelRight, Plus, RulerDimensionLine } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { ProfileView } from "@/lib/layout";
import { cn } from "@/lib/utils";
import type { LayoutMode, Placement } from "./studio-layout";
import { KEYS } from "./use-studio-shortcuts";

interface ZoomToolbarProps {
  zoom: number;
  /** The zoom follows the fit (the Fit button shows active). */
  fitting: boolean;
  onToggleLeft: () => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  showRulers: boolean;
  onToggleRulers: () => void;
  onZoomStep: (dir: 1 | -1) => void;
  onFit: () => void;
  /** The profile shown on the canvas (resolution button). */
  profile: ProfileView;
  /** Open Dashboard › Profile. */
  onOpenProfile: () => void;
  /** The inspector position setting; the button cycles it. */
  layoutMode: LayoutMode;
  /** Where the inspector actually is (Auto resolves to one of these). */
  placement: Placement;
  onCycleLayout: () => void;
}

const DOCK_LABEL: Record<LayoutMode, string> = { side: "Side", bottom: "Bottom", auto: "Auto" };

const BAR_BUTTON = "h-7 w-7 rounded-md hover:bg-[#24242a]";
const TOGGLE_BUTTON = cn(BAR_BUTTON, "text-[#c9c9cf]");
const TEXT_BUTTON = "flex h-[26px] items-center gap-1 rounded-md px-2 text-[11.5px] text-[#c9c9cf] transition-colors hover:bg-[#24242a]";

function Divider() {
  return <div className="mx-1 h-[18px] w-px shrink-0 bg-ui-strong" />;
}

/**
 * The floating bar over the canvas (16 px from the bottom, centred): left
 * panel, grid and ruler toggles, zoom, Fit, the resolution button and the
 * inspector position.
 */
export function ZoomToolbar({
  zoom,
  fitting,
  onToggleLeft,
  showGrid,
  onToggleGrid,
  showRulers,
  onToggleRulers,
  onZoomStep,
  onFit,
  profile,
  onOpenProfile,
  layoutMode,
  placement,
  onCycleLayout,
}: ZoomToolbarProps) {
  const DockIcon = placement === "bottom" ? PanelBottom : PanelRight;
  const dockLabel = DOCK_LABEL[layoutMode];
  return (
    <div
      className={cn(
        "absolute bottom-4 left-1/2 z-30 flex h-9 -translate-x-1/2 items-center gap-0.5 whitespace-nowrap px-1",
        "rounded-[10px] border border-ui-strong bg-ui-raised font-ui shadow-ui-float"
      )}
    >
      <IconButton label="Toggle the left panel" className={BAR_BUTTON} onClick={onToggleLeft}>
        <PanelLeftClose className="h-[18px] w-[18px]" />
      </IconButton>
      <IconButton label="Toggle grid" className={TOGGLE_BUTTON} active={showGrid} aria-pressed={showGrid} onClick={onToggleGrid}>
        <Grid3x3 className="h-[18px] w-[18px]" />
      </IconButton>
      <IconButton label="Toggle rulers" className={TOGGLE_BUTTON} active={showRulers} aria-pressed={showRulers} onClick={onToggleRulers}>
        <RulerDimensionLine className="h-[18px] w-[18px]" />
      </IconButton>
      <Divider />
      <IconButton label={`Zoom out (${KEYS.zoomOut})`} className={BAR_BUTTON} onClick={() => onZoomStep(-1)}>
        <Minus className="h-[18px] w-[18px]" />
      </IconButton>
      <span className="min-w-11 text-center font-ui-mono text-[11.5px] text-ui-1">{Math.round(zoom * 100)}%</span>
      <IconButton label={`Zoom in (${KEYS.zoomIn})`} className={BAR_BUTTON} onClick={() => onZoomStep(1)}>
        <Plus className="h-[18px] w-[18px]" />
      </IconButton>
      <button
        type="button"
        onClick={onFit}
        aria-pressed={fitting}
        title={`Fit the page to the canvas and keep it fitted (${KEYS.fit})`}
        className={cn(
          "h-[26px] rounded-md px-[9px] text-[11.5px] font-medium transition-colors",
          fitting ? "bg-ui-active text-ui-1" : "text-[#8f8f99] hover:bg-[#24242a]"
        )}
      >
        Fit
      </button>
      <Divider />
      <button
        type="button"
        onClick={onOpenProfile}
        title="Profile size, grid and spacing"
        className={cn(TEXT_BUTTON, "font-ui-mono text-[11px]")}
      >
        {profile.width} × {profile.height}
      </button>
      <button
        type="button"
        onClick={onCycleLayout}
        title={`Inspector position: ${dockLabel} (click to change; ${KEYS.dock} collapses)`}
        className={cn(TEXT_BUTTON, "pl-1.5")}
      >
        <DockIcon className="h-[17px] w-[17px]" /> {dockLabel}
      </button>
    </div>
  );
}
