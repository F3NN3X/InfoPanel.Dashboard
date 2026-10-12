import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { KEYS } from "./use-studio-shortcuts";
import type { Placement } from "./studio-layout";

const collapseLabel = (collapsed: boolean) => `${collapsed ? "Expand" : "Collapse"} the inspector (${KEYS.dock})`;

interface DockToggleProps {
  onToggle: () => void;
  /** What the collapsed dock holds (the selected zone, or the document tabs). */
  summary: string;
}

/** The collapsed bottom dock's bar: expands it, and says what is inside. */
export function DockToggle({ onToggle, summary }: DockToggleProps) {
  const label = collapseLabel(true);
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded={false}
      className="flex h-6 min-w-0 shrink-0 items-center gap-1 rounded-md px-1.5 font-ui text-xs text-ui-4 transition-colors hover:bg-ui-hover hover:text-ui-1"
    >
      <ChevronUp className="h-3.5 w-3.5" />
      <span className="max-w-[28rem] truncate">{summary}</span>
    </button>
  );
}

/** A small tab on the expanded inspector's edge (under the canvas, or beside it) that collapses it. */
export function CollapseTab({ placement, onToggle, className }: { placement: Placement; onToggle: () => void; className?: string }) {
  const label = collapseLabel(false);
  const bottom = placement === "bottom";
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded
      className={cn(
        "flex items-center justify-center border border-ui-subtle bg-ui-panel text-ui-4 opacity-50 transition-opacity hover:text-ui-1 hover:opacity-100 focus-visible:opacity-100",
        bottom ? "h-4 w-9 rounded-t-md border-b-0" : "h-9 w-4 rounded-l-md border-r-0",
        className
      )}
    >
      {bottom ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
    </button>
  );
}

/** The slim strip a collapsed side inspector leaves at the window's edge: expands it. */
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
