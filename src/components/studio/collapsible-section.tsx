import type { ReactNode } from "react";
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

/** A bordered inspector section that remembers whether it is open. */
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
    <div className="break-inside-avoid rounded-md border border-border/70">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(id, !open)}
        className="flex w-full items-center justify-between px-2.5 py-2 text-left text-xs font-medium text-foreground"
      >
        <span>{title}</span>
        <span className="text-[11px] font-normal text-muted-foreground">
          {aside}
          <span className={cn("ml-1.5 inline-block transition-transform", open && "rotate-90")}>
            ›
          </span>
        </span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border/70 px-2.5 py-2.5">{children}</div>
      )}
    </div>
  );
}
