import type { ReactNode } from "react";
import { ChevronDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSectionState } from "./use-section-state";

/** Attribute carrying a section's id (jump-to finds sections by it). */
export const SETTING_CARD = "data-setting-card";

/** The remembered open state of a section. */
export const sectionStateId = (id: string) => `section:${id}`;

interface SettingSectionProps {
  /** The section id (also its remembered open state). */
  id: string;
  title: string;
  /** Short description, shown as a tooltip on the info icon. */
  hint?: string;
  /** The tab the section is in (search results label their sections with it). */
  tabLabel?: string;
  /** Small text after the title (e.g. the scope the section edits). */
  badge?: string;
  /** Settings of this section set here; 0 hides the count and Reset. */
  changed: number;
  /** Header controls before Reset (the style tools). */
  actions?: ReactNode;
  /** Drop just this section's own values. */
  onReset?: () => void;
  /** Open regardless of the remembered state (a search match inside). */
  forceOpen?: boolean;
  /** Span every column of the bottom dock (a code editor). */
  wide?: boolean;
  /** Marks the section the studio scrolls into view when a panel widget is selected. */
  editor?: boolean;
  /** Briefly outline the section (it was just jumped to). */
  flash?: boolean;
  children: ReactNode;
}

/**
 * An inspector section (README §4.6): a header with a chevron that turns
 * −90° when collapsed, the title, "N changed" and a Reset of only this
 * section, then its field rows. It never splits across dock columns.
 */
export function SettingSection({
  id,
  title,
  hint,
  tabLabel,
  badge,
  changed,
  actions,
  onReset,
  forceOpen = false,
  wide = false,
  editor = false,
  flash = false,
  children,
}: SettingSectionProps) {
  const { isOpen, setOpen } = useSectionState();
  const open = forceOpen || isOpen(sectionStateId(id), true);
  return (
    <section
      {...{ [SETTING_CARD]: id }}
      data-widget-editor={editor ? "" : undefined}
      className={cn(
        "break-inside-avoid border-b border-ui-subtle transition-shadow duration-500",
        wide && "[column-span:all]",
        flash && "shadow-[inset_0_0_0_1.5px_var(--ui-accent)]"
      )}
    >
      <header className="flex min-h-[38px] items-center gap-2 px-4">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(sectionStateId(id), !open)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <ChevronDown
            className={cn("h-3.5 w-3.5 shrink-0 text-ui-4 transition-transform duration-150", !open && "-rotate-90")}
          />
          <span className="truncate text-[12.5px] font-semibold text-ui-1">{title}</span>
          {tabLabel && (
            <span className="shrink-0 rounded border border-ui-default px-1 text-[10.5px] text-ui-4">{tabLabel}</span>
          )}
          {badge && <span className="shrink-0 text-[11px] text-ui-5">{badge}</span>}
        </button>
        {hint && (
          <span title={hint} className="shrink-0 text-ui-5 hover:text-ui-2">
            <Info className="h-3.5 w-3.5" aria-label={hint} />
          </span>
        )}
        {changed > 0 && (
          <span className="shrink-0 font-ui-mono text-[10px] text-ui-accent-text">{changed} changed</span>
        )}
        {actions}
        {changed > 0 && onReset && (
          <button
            type="button"
            onClick={onReset}
            title={`Reset ${title}`}
            className="shrink-0 text-[11px] text-ui-4 hover:text-ui-1"
          >
            Reset
          </button>
        )}
      </header>
      {open && <div className="pb-2.5">{children}</div>}
    </section>
  );
}
