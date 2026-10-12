import { ChevronDown, ChevronUp } from "lucide-react";
import { KEYS } from "./use-studio-shortcuts";

interface DockToggleProps {
  collapsed: boolean;
  onToggle: () => void;
  /** What the collapsed dock holds (the selected zone, or the document tabs). */
  summary: string;
}

/** The dock bar's left end: collapse / expand, and what is inside when collapsed. */
export function DockToggle({ collapsed, onToggle, summary }: DockToggleProps) {
  const label = `${collapsed ? "Expand" : "Collapse"} the panel (${KEYS.dock})`;
  return (
    <button
      type="button"
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded={!collapsed}
      className="flex h-6 min-w-0 shrink-0 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      <span className="max-w-[28rem] truncate">{collapsed ? summary : "Panel"}</span>
    </button>
  );
}
