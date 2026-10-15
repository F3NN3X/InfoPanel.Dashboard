import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KEYS } from "./use-studio-shortcuts";

const collapseLabel = (collapsed: boolean) => `${collapsed ? "Expand" : "Collapse"} the inspector (${KEYS.dock})`;

/** A small tab on the docked inspector's left edge that collapses it. */
export function CollapseTab({ onToggle, className }: { onToggle: () => void; className?: string }) {
  const label = collapseLabel(false);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded
      className={cn(
        "flex items-center justify-center border border-ui-subtle bg-ui-panel text-ui-4 opacity-50 transition-opacity hover:text-ui-1 hover:opacity-100 focus-visible:opacity-100",
        "h-9 w-4 rounded-l-md border-r-0",
        className
      )}
    >
      <ChevronRight className="h-3.5 w-3.5" />
    </button>
  );
}

/** The slim strip a collapsed docked inspector leaves at the window's edge: expands it. */
export function ExpandStrip({ onToggle }: { onToggle: () => void }) {
  const label = collapseLabel(true);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded={false}
      className="flex w-5 shrink-0 items-center justify-center border-l border-ui-subtle bg-ui-panel text-ui-4 transition-colors hover:bg-ui-hover hover:text-ui-1"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
    </button>
  );
}
