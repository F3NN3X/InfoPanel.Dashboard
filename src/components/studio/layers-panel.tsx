import { Box, Eye, EyeOff, PanelsTopLeft, Square, Trash2 } from "lucide-react";
import { BLANK_MODULE, PANEL_ID, type Placement } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { useInspectorLayout } from "./inspector-layout";
import { isToggleClick } from "./selection";
import { placementTitle } from "./studio-modules";
import { sortZones } from "./zone-geometry";

interface LayersPanelProps {
  placements: Placement[];
  /** The selected zones, the primary last. */
  selectedIds: string[];
  /**
   * Select the zone and bring it into view on the canvas, or (`toggle`:
   * Shift / Ctrl / ⌘ click) add it to or remove it from the selection.
   */
  onSelect: (id: string, toggle: boolean) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

/** Blank zone, panel, or a plain widget. */
function zoneIcon(p: Placement) {
  if (p.module === BLANK_MODULE) return Square;
  if (p.module === PANEL_ID) return PanelsTopLeft;
  return Box;
}

const ROW_BUTTON = "rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground";

/** The Layers drawer: every zone of the profile in grid reading order. */
export function LayersPanel({
  placements,
  selectedIds,
  onSelect,
  onToggle,
  onRemove,
}: LayersPanelProps) {
  const dock = useInspectorLayout() === "dock";
  if (placements.length === 0)
    return (
      <p className="p-3 text-xs text-muted-foreground/60">
        No zones yet. Draw one on the canvas, or add a widget from the Add drawer.
      </p>
    );
  return (
    <div className={dock ? "space-y-0.5 p-2" : "space-y-1 p-3"}>
      {sortZones(placements).map((p) => {
        const Icon = zoneIcon(p);
        const hidden = p.visible === false;
        return (
          <div
            key={p.id}
            role="button"
            tabIndex={0}
            // Shift+click would extend a text selection over the rows.
            onMouseDown={(e) => isToggleClick(e) && e.preventDefault()}
            onClick={(e) => onSelect(p.id, isToggleClick(e))}
            onKeyDown={(e) => {
              if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onSelect(p.id, false);
              }
            }}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border px-2 text-xs",
              dock ? "py-1" : "py-1.5",
              selectedIds.includes(p.id) ? "border-ring bg-accent" : "border-border hover:border-ring/50",
              hidden && "opacity-50"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate text-foreground/85">{placementTitle(p)}</span>
            <span className="shrink-0 tabular-nums text-[10px] text-muted-foreground/60">
              C{p.colStart}·R{p.rowStart} {p.colSpan}×{p.rowSpan}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle(p.id);
              }}
              className={ROW_BUTTON}
              title={hidden ? "Show" : "Hide"}
            >
              {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p.id);
              }}
              className={ROW_BUTTON}
              title="Remove"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted-foreground/60">
        Click a zone to select it; Shift / Ctrl+click selects several. Hidden zones stay editable but don't show in kiosk mode.
      </p>
    </div>
  );
}
