import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSectionState } from "./use-section-state";

interface CollapsibleSectionProps {
  /** Remembered-state id (see `useSectionState`). */
  id: string;
  title: ReactNode;
  /** Right-aligned summary in the header (e.g. "2 changed"). */
  aside?: ReactNode;
  /** Open regardless of the remembered state (e.g. a search match inside). */
  forceOpen?: boolean;
  /** Open until the user closes it (default: closed until opened). */
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A bordered sub-section inside an inspector section that remembers whether it is open. */
export function CollapsibleSection({
  id,
  title,
  aside,
  forceOpen = false,
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) {
  const { isOpen, setOpen } = useSectionState();
  const open = forceOpen || isOpen(id, defaultOpen);
  return (
    <div className="break-inside-avoid rounded-lg border border-ui-default">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(id, !open)}
        className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left text-[12px] font-medium text-ui-1"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-ui-4 transition-transform duration-150", !open && "-rotate-90")}
        />
        <span className="flex-1">{title}</span>
        <span className="font-ui-mono text-[10px] font-normal text-ui-accent-text">{aside}</span>
      </button>
      {open && <div className="space-y-3 border-t border-ui-default px-2.5 py-2.5">{children}</div>}
    </div>
  );
}
