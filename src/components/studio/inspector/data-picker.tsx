import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Search } from "lucide-react";
import type { DataPoint } from "@/lib/data-points";
import { cn } from "@/lib/utils";
import { TypeIcon } from "../explorer/explorer-parts";
import { pickerResults, pointPlace } from "./bound-data-model";

interface DataPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  points: readonly DataPoint[];
  /**
   * "widget": every row toggles a binding (checkboxes); "item": picking a
   * row sets a panel widget's sensor and closes the picker.
   */
  mode: "widget" | "item";
  /** The keys bound now. */
  bound: ReadonlySet<string>;
  onToggle: (point: DataPoint) => void;
  onOpenExplorer: () => void;
}

const FOOT_BUTTON = "h-7 rounded-md px-3 text-[12px] font-medium";

/** The data point picker (README §4.9). */
export function DataPicker({ open, onOpenChange, points, mode, bound, onToggle, onOpenExplorer }: DataPickerProps) {
  const [query, setQuery] = useState("");
  const { shown, total } = pickerResults(points, query);
  const pick = (p: DataPoint) => {
    onToggle(p);
    if (mode === "item") onOpenChange(false);
  };
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Popup className="fixed left-1/2 top-[10vh] z-50 flex max-h-[72vh] w-[min(600px,calc(100vw-32px))] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-ui-menu bg-ui-panel font-ui text-ui-2 shadow-ui-modal outline-none">
          <Dialog.Title className="sr-only">{mode === "item" ? "Pick a data point" : "Bind data"}</Dialog.Title>
          <div className="relative shrink-0 border-b border-ui-subtle p-3">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-ui-4" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 650+ data points — e.g. gpu temp, steam level"
              aria-label="Search data points"
              className="h-9 w-full rounded-lg border border-ui-default bg-ui-app pl-9 pr-3 text-[13px] text-ui-1 outline-none placeholder:text-ui-4 focus:border-ui-accent"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
            {shown.map((p) => {
              const on = bound.has(p.key);
              return (
                <li key={p.key}>
                  <button
                    type="button"
                    role={mode === "widget" ? "checkbox" : "option"}
                    aria-checked={mode === "widget" ? on : undefined}
                    aria-selected={mode === "item" ? on : undefined}
                    onClick={() => pick(p)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-ui-hover",
                      on && "bg-ui-accent-soft"
                    )}
                  >
                    {mode === "widget" && (
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border",
                          on ? "border-ui-accent bg-ui-accent text-ui-inverse-fg" : "border-ui-strong bg-ui-app"
                        )}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                    )}
                    <TypeIcon type={p.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ui-1">{p.name}</span>
                      <span className="block truncate text-[11px] text-ui-4">
                        {pointPlace(p)} · <span className="font-ui-mono">{p.key}</span>
                      </span>
                    </span>
                    <span className="max-w-[30%] shrink-0 truncate font-ui-mono text-[11.5px] text-ui-3">{p.raw}</span>
                  </button>
                </li>
              );
            })}
            {shown.length === 0 && <li className="px-3 py-6 text-center text-[12px] text-ui-4">No data points match.</li>}
          </ul>
          <div className="flex shrink-0 items-center gap-2 border-t border-ui-subtle px-3 py-2.5 text-[11.5px] text-ui-4">
            <span className="font-ui-mono">
              {total > shown.length ? `${shown.length} of ${total}` : total} data point{total === 1 ? "" : "s"}
            </span>
            <span>·</span>
            <span>{bound.size} bound</span>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onOpenExplorer();
              }}
              className={cn(FOOT_BUTTON, "border border-ui-strong bg-ui-raised text-ui-2 hover:text-ui-1")}
            >
              Open data explorer
            </button>
            <Dialog.Close className={cn(FOOT_BUTTON, "bg-ui-inverse text-ui-inverse-fg")}>Done</Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
