import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Square, X } from "lucide-react";
import { BLANK_MODULE, type Placement } from "@/lib/layout";
import type { UserPanelPreset } from "@/lib/panel-model";
import {
  filterInsertables,
  insertables,
  InsertFilters,
  InsertList,
  type InsertCategory,
} from "./insert-panel";
import { placementTitle } from "./studio-modules";

interface WidgetPickerDialogProps {
  /** The zone to assign a widget to; null = closed. */
  placement: Placement | null;
  /** Placements of the profile (usage counts). */
  placements: Placement[];
  /** The user's saved panels (`config.panelPresets`). */
  savedPanels?: UserPanelPreset[];
  onRenamePreset: (id: string, name: string) => void;
  onDeletePreset: (id: string) => void;
  /** Assign: "blank", "module:<id>" or "preset:<id>". */
  onPick: (value: string) => void;
  onClose: () => void;
}

/** Search, categories and the list; remounts (resets) on every open. */
function PickerBody({
  placement,
  placements,
  savedPanels,
  onPick,
  onRenamePreset,
  onDeletePreset,
}: Omit<WidgetPickerDialogProps, "onClose" | "placement"> & { placement: Placement }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<InsertCategory>("All");
  return (
    <>
      <div className="border-b p-3">
        <InsertFilters
          query={query}
          onQuery={setQuery}
          category={category}
          onCategory={setCategory}
          autoFocus
        />
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {placement.module !== BLANK_MODULE && (
          <button
            type="button"
            onClick={() => onPick("blank")}
            className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-2 py-1.5 text-left text-xs text-muted-foreground hover:border-ring/50 hover:text-foreground"
          >
            <Square className="h-3 w-3" /> Blank zone — remove the widget
          </button>
        )}
        <InsertList
          items={filterInsertables(insertables(savedPanels), query, category)}
          placements={placements}
          context="picker"
          onPick={(item) => onPick(`${item.kind === "panel" ? "preset" : "module"}:${item.id}`)}
          onRenamePreset={onRenamePreset}
          onDeletePreset={onDeletePreset}
        />
      </div>
    </>
  );
}

/**
 * Pick the widget (or panel) for a zone: search, categories and minimum
 * sizes, plus "Blank zone". The zone grows to the widget's minimum size.
 */
export function WidgetPickerDialog({ placement, onClose, ...body }: WidgetPickerDialogProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog.Root open={placement !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup
          ref={popupRef}
          initialFocus={() => popupRef.current?.querySelector("input") ?? true}
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[80vh] w-[26rem] -translate-x-1/2 -translate-y-1/2 flex-col rounded-lg border border-border bg-popover text-foreground shadow-xl outline-none"
        >
          {placement && (
            <>
              <div className="flex items-start gap-2 border-b px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <Dialog.Title className="text-sm font-semibold">Pick a widget</Dialog.Title>
                  <Dialog.Description className="truncate text-xs text-muted-foreground">
                    Zone {placement.colSpan}×{placement.rowSpan} · now {placementTitle(placement)}
                  </Dialog.Description>
                </div>
                <Dialog.Close
                  title="Close"
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              </div>
              <PickerBody placement={placement} {...body} />
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
