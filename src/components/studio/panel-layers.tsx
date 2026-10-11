import { useState, type DragEvent, type KeyboardEvent } from "react";
import { Menu } from "@base-ui/react/menu";
import { Eye, EyeOff, GripVertical, MoreHorizontal } from "lucide-react";
import type { Widget, WidgetKind } from "@/lib/panel-model";
import { cn } from "@/lib/utils";
import { ITEM, POPUP, SEPARATOR } from "./style-tools";
import { ChangeKindSubmenu } from "./widget-kind-menu";
import { KIND_INFO, widgetName } from "./widget-kinds";

/** Drag payload type of a layer row (only rows of this list accept it). */
const DND_MIME_WIDGET = "application/x-infopanel-widget";

interface PanelLayersProps {
  widgets: Widget[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleVisible: (id: string) => void;
  /** Move a widget so it ends up at `index`. */
  onMove: (id: string, index: number) => void;
  onDuplicate: (id: string) => void;
  onCopy: (id: string) => void;
  /** Paste the copied widget after this one; omitted = nothing copied. */
  onPasteAfter?: (id: string) => void;
  onChangeKind: (id: string, kind: WidgetKind) => void;
  onRemove: (id: string) => void;
}

/**
 * The panel's widgets as layers: drag a row (or Alt+↑/↓ with the list
 * focused) to reorder, ↑/↓ to select, the eye to hide, "⋯" for the rest.
 */
export function PanelLayers({
  widgets,
  selectedId,
  onSelect,
  onToggleVisible,
  onMove,
  onDuplicate,
  onCopy,
  onPasteAfter,
  onChangeKind,
  onRemove,
}: PanelLayersProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  // Insertion point while dragging: the row index the dragged one goes before.
  const [dropAt, setDropAt] = useState<number | null>(null);

  const onDragOver = (e: DragEvent, i: number) => {
    if (!dragId || !e.dataTransfer.types.includes(DND_MIME_WIDGET)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const from = widgets.findIndex((w) => w.id === dragId);
    if (dragId && from >= 0 && dropAt !== null) onMove(dragId, dropAt > from ? dropAt - 1 : dropAt);
    endDrag();
  };

  const endDrag = () => {
    setDragId(null);
    setDropAt(null);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // Keys in a row's (portaled) menu bubble here through React: not ours.
    if (!e.currentTarget.contains(e.target as Node)) return;
    const i = widgets.findIndex((w) => w.id === selectedId);
    if (i < 0 || (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Delete")) return;
    e.preventDefault(); // not the studio's zone nudge / remove
    if (e.key === "Delete") return onRemove(widgets[i].id);
    const d = e.key === "ArrowUp" ? -1 : 1;
    if (e.altKey) onMove(widgets[i].id, i + d);
    else if (widgets[i + d]) onSelect(widgets[i + d].id);
  };

  if (widgets.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-2 text-center text-xs text-muted-foreground/60">
        no widgets yet — add one above
      </div>
    );
  }

  return (
    <div
      role="listbox"
      aria-label="Widgets (Alt+↑/↓ to reorder)"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDropAt(null)}
      className="space-y-1 rounded-md outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {widgets.map((w, i) => {
        const { icon: Icon, label } = KIND_INFO[w.kind];
        return (
          <div
            key={w.id}
            role="option"
            aria-selected={w.id === selectedId}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DND_MIME_WIDGET, w.id);
              e.dataTransfer.effectAllowed = "move";
              setDragId(w.id);
            }}
            onDragEnd={endDrag}
            onDragOver={(e) => onDragOver(e, i)}
            onDrop={onDrop}
            onClick={() => onSelect(w.id)}
            className={cn(
              "relative flex cursor-pointer items-center gap-1.5 rounded-md border px-1.5 py-1",
              w.id === selectedId ? "border-ring bg-accent/40" : "border-border hover:border-ring/40",
              w.id === dragId && "opacity-40",
              !w.visible && "opacity-50"
            )}
          >
            {dropAt === i && <DropLine edge="top" />}
            {dropAt === i + 1 && i === widgets.length - 1 && <DropLine edge="bottom" />}
            <GripVertical className="h-3 w-3 shrink-0 cursor-grab text-muted-foreground/50" />
            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label={label} />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground/85" title={`${label}: ${widgetName(w)}`}>
              {widgetName(w)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisible(w.id);
              }}
              className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
              title={w.visible ? "Hide widget" : "Show widget"}
            >
              {w.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <Menu.Root>
              <Menu.Trigger
                onClick={(e) => e.stopPropagation()}
                className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
                title="Widget actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner className="z-50" sideOffset={4} align="end">
                  <Menu.Popup className={POPUP}>
                    <Menu.Item className={ITEM} onClick={() => onDuplicate(w.id)}>
                      Duplicate
                    </Menu.Item>
                    <Menu.Item className={ITEM} onClick={() => onCopy(w.id)}>
                      Copy
                    </Menu.Item>
                    <Menu.Item
                      className={ITEM}
                      disabled={!onPasteAfter}
                      onClick={() => onPasteAfter?.(w.id)}
                    >
                      Paste after
                    </Menu.Item>
                    <ChangeKindSubmenu kind={w.kind} onChange={(kind) => onChangeKind(w.id, kind)} />
                    <Menu.Separator className={SEPARATOR} />
                    <Menu.Item className={cn(ITEM, "text-red-400")} onClick={() => onRemove(w.id)}>
                      Delete
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          </div>
        );
      })}
    </div>
  );
}

/** The insertion line shown while dragging a row. */
function DropLine({ edge }: { edge: "top" | "bottom" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-ring",
        edge === "top" ? "-top-[3px]" : "-bottom-[3px]"
      )}
    />
  );
}
