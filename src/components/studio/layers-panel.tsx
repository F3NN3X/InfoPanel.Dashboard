import { Eye, EyeOff, Paintbrush, Plus, Trash2 } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import type { Placement } from "@/lib/layout";
import { cn } from "@/lib/utils";
import { isToggleClick } from "./selection";
import { placementTitle } from "./studio-modules";
import { moduleIcon } from "./zone-icons";
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
  /** The "+" in the header: open the Add panel. */
  onAdd: () => void;
  /** A right-click on a row (viewport coordinates): the canvas builds the zone menu. */
  onContextMenu?: (id: string, x: number, y: number) => void;
}

const ROW_BUTTON = "h-6 w-6";

/** The Layers panel: every zone of the profile in grid reading order. */
export function LayersPanel({
  placements,
  selectedIds,
  onSelect,
  onToggle,
  onRemove,
  onAdd,
  onContextMenu,
}: LayersPanelProps) {
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 border-b border-ui-subtle py-2.5 pl-3 pr-2.5">
        <span className="text-[13px] font-semibold text-ui-1">Layers</span>
        <span className="flex-1 font-ui-mono text-[11px] text-ui-4">{placements.length}</span>
        <IconButton label="Add a widget" className="h-[26px] w-[26px]" onClick={onAdd}>
          <Plus className="h-4 w-4" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
        {placements.length === 0 && (
          <p className="p-2 text-xs text-ui-4">No zones yet. Draw one on the canvas, or add a widget.</p>
        )}
        {sortZones(placements).map((p) => {
          const Icon = moduleIcon(p.module);
          const hidden = p.visible === false;
          return (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              title={`C${p.colStart}·R${p.rowStart} ${p.colSpan}×${p.rowSpan}`}
              // Shift+click would extend a text selection over the rows.
              onMouseDown={(e) => isToggleClick(e) && e.preventDefault()}
              onClick={(e) => onSelect(p.id, isToggleClick(e))}
              onContextMenu={
                onContextMenu
                  ? (e) => {
                      e.preventDefault();
                      onContextMenu(p.id, e.clientX, e.clientY);
                    }
                  : undefined
              }
              onKeyDown={(e) => {
                if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onSelect(p.id, false);
                }
              }}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-[7px] py-1.5 pl-2 pr-1.5 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent/60",
                selectedIds.includes(p.id) ? "bg-ui-accent-soft" : "hover:bg-ui-hover",
                hidden && "opacity-50"
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-ui-3" strokeWidth={1.75} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-ui-1">{placementTitle(p)}</span>
              {p.styleMode === "custom" && (
                <Paintbrush className="h-3 w-3 shrink-0 text-ui-4" aria-label="Custom style" />
              )}
              <span className="shrink-0 font-ui-mono text-[10.5px] text-ui-4">
                {p.colSpan}×{p.rowSpan}
              </span>
              <IconButton
                label={hidden ? "Show" : "Hide"}
                className={ROW_BUTTON}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(p.id);
                }}
              >
                {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </IconButton>
              <IconButton
                label="Delete"
                danger
                className={ROW_BUTTON}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(p.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </IconButton>
            </div>
          );
        })}
      </div>
      <p className="shrink-0 border-t border-ui-subtle px-3 py-2.5 text-[10.5px] leading-snug text-ui-4">
        Shift-click to select several. Hidden widgets stay editable but don't show in kiosk view.
      </p>
    </>
  );
}
