import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { MoreHorizontal, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Insertable } from "./insert-panel";
import { DND_MIME, DND_MIME_PANEL } from "./studio-modules";
import { ITEM, POPUP, SEPARATOR } from "./style-tools";

export type InsertContext = "drawer" | "picker";

/** Rename / delete for a saved panel's row. */
export interface SavedPanelActions {
  onRename: (name: string) => void;
  onDelete: () => void;
}

/** The inline name input of a saved panel being renamed. */
function RenameInput({ initial, onDone }: { initial: string; onDone: (name: string | null) => void }) {
  const [name, setName] = useState(initial);
  const commit = () => onDone(name.trim() || null);
  return (
    <input
      autoFocus
      value={name}
      onChange={(e) => setName(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone(null);
      }}
      onBlur={commit}
      aria-label="Panel name"
      className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground outline-none focus:border-ring"
    />
  );
}

/** The "⋯" menu of a saved panel's row. */
function SavedPanelMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        onClick={(e) => e.stopPropagation()}
        className="rounded p-0.5 hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
        title="Saved panel actions"
      >
        <MoreHorizontal className="h-3 w-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} align="end">
          <Menu.Popup className={POPUP} onClick={(e) => e.stopPropagation()}>
            <Menu.Item className={ITEM} onClick={onRename}>
              Rename…
            </Menu.Item>
            <Menu.Separator className={SEPARATOR} />
            <Menu.Item className={cn(ITEM, "text-red-400")} onClick={onDelete}>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** One row: title, minimum size, usage badge, add button (and "⋯" for saved panels). */
export function InsertRow({
  item,
  count,
  context,
  onPick,
  saved,
}: {
  item: Insertable;
  count: number;
  context: InsertContext;
  onPick: () => void;
  /** Set for the user's saved panels. */
  saved?: SavedPanelActions;
}) {
  const [renaming, setRenaming] = useState(false);
  const draggable = context === "drawer" && !renaming;
  const pickOnClick = context === "picker" && !renaming;
  const hint = context === "drawer" ? "Drag onto the canvas, or click + to add" : "Click to use it for this zone";
  const thing = item.kind === "panel" ? "panel" : "widget";
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => {
        e.dataTransfer.setData(item.kind === "panel" ? DND_MIME_PANEL : DND_MIME, item.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={pickOnClick ? onPick : undefined}
      className={cn(
        "flex items-center justify-between rounded-md border border-border px-2 py-1.5 text-xs hover:border-ring/50",
        draggable && "cursor-grab active:cursor-grabbing",
        pickOnClick && "cursor-pointer"
      )}
      title={item.description ? `${item.description} — ${hint.toLowerCase()}` : hint}
    >
      {renaming && saved ? (
        <RenameInput
          initial={item.title}
          onDone={(name) => {
            setRenaming(false);
            if (name && name !== item.title) saved.onRename(name);
          }}
        />
      ) : (
        <span className="truncate text-foreground/85">{item.title}</span>
      )}
      <span className="ml-2 flex shrink-0 items-center gap-1 text-muted-foreground">
        <span className="tabular-nums text-[10px] text-muted-foreground/60">
          {item.cols}×{item.rows}
        </span>
        {count > 0 && (
          <Badge variant="secondary" className="px-1.5 text-[10px]">
            {count}
          </Badge>
        )}
        {saved && <SavedPanelMenu onRename={() => setRenaming(true)} onDelete={saved.onDelete} />}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPick();
          }}
          className="rounded p-0.5 hover:bg-accent hover:text-foreground"
          title={
            context === "picker" ? `Use this ${thing}` : item.kind === "panel" ? "Add panel to canvas" : "Add to canvas"
          }
        >
          <Plus className="h-3 w-3" />
        </button>
      </span>
    </div>
  );
}
