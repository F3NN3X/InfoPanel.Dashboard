import type { ReactNode } from "react";
import { ChevronRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInspectorLayout } from "./inspector-layout";
import { useSectionState } from "./use-section-state";

/** Attribute carrying a card's category id (jump-to and search reveal find cards by it). */
export const SETTING_CARD = "data-setting-card";

interface SettingCardProps {
  /** The category id (also the remembered open state, `card:<id>`). */
  id: string;
  title: string;
  /** Short description, shown as a tooltip on the info icon. */
  hint?: string;
  /** Settings of this card set on the widget; 0 hides the badge and Reset. */
  changed: number;
  /** Small muted text after the title (e.g. the scope the card edits). */
  badge?: string;
  /** Extra controls on a row above the rows (e.g. the style tools). */
  actions?: ReactNode;
  /** Drop just this card's own values. */
  onReset?: () => void;
  /** Header collapses the body (beside the canvas); the dock shows every card open. */
  collapsible?: boolean;
  defaultOpen?: boolean;
  /** Open regardless of the remembered state (a search match inside). */
  forceOpen?: boolean;
  /** Span every column of the dock (a code editor). */
  wide?: boolean;
  /** Marks the card the studio scrolls into view when a panel widget is selected. */
  editor?: boolean;
  /** Briefly outline the card (it was just jumped to). */
  flash?: boolean;
  children: ReactNode;
}

/**
 * A category card: title, hint, changed count with its own Reset, and the
 * rows. ~300px wide in the dock, full width beside the canvas, where it
 * can be collapsed.
 */
export function SettingCard({
  id,
  title,
  hint,
  badge,
  changed,
  actions,
  onReset,
  collapsible = false,
  defaultOpen = true,
  forceOpen = false,
  wide = false,
  editor = false,
  flash = false,
  children,
}: SettingCardProps) {
  const dock = useInspectorLayout() === "dock";
  const { isOpen, setOpen } = useSectionState();
  const canCollapse = collapsible && !dock;
  const open = !canCollapse || forceOpen || isOpen(`card:${id}`, defaultOpen);
  return (
    <section
      {...{ [SETTING_CARD]: id }}
      data-widget-editor={editor ? "" : undefined}
      className={cn(
        "break-inside-avoid rounded-md border bg-card/40 transition-shadow duration-500",
        dock && !wide ? "w-[300px]" : "w-full",
        dock && wide && "[column-span:all]",
        flash ? "border-ring shadow-[0_0_0_2px_var(--color-ring)]" : "border-border/70"
      )}
    >
      <header className="flex items-center gap-1.5 px-2.5 py-1.5">
        {canCollapse ? (
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(`card:${id}`, !open)}
            className="flex min-w-0 items-center gap-1 text-left text-xs font-medium text-foreground"
          >
            <ChevronRight className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")} />
            <span className="truncate">{title}</span>
          </button>
        ) : (
          <h3 className="min-w-0 truncate text-xs font-medium text-foreground">{title}</h3>
        )}
        {badge && <span className="shrink-0 text-[10px] text-muted-foreground/60">{badge}</span>}
        {hint && (
          <span title={hint} className="shrink-0 text-muted-foreground/60">
            <Info className="h-3 w-3" aria-label={hint} />
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {changed > 0 && (
            <span className="rounded-full bg-ring/20 px-1.5 text-[10px] tabular-nums text-foreground">
              {changed}
            </span>
          )}
          {changed > 0 && onReset && (
            <button
              type="button"
              onClick={onReset}
              title={`Reset ${title} to its defaults`}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Reset
            </button>
          )}
        </span>
      </header>
      {open && (
        <div className="space-y-2 border-t border-border/60 px-2.5 py-2">
          {actions && <div className="flex justify-end">{actions}</div>}
          {children}
        </div>
      )}
    </section>
  );
}
