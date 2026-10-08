import type { CSSProperties, ReactNode } from "react";
import { widgetIcon } from "@/lib/widget-icons";

/**
 * The standard per-widget chrome (see `modules/standard-settings.ts` and
 * `docs/widget-settings.md`): a user-supplied background image behind the
 * surface, an optional header (icon + custom title), and an accent color
 * exposed to the widget via the `--wp-accent` CSS variable.
 *
 * Every modern widget wraps its body in this, so the standard options
 * work identically everywhere. Glass surfaces let the background show
 * through; matte surfaces cover it (that is intended).
 */
export interface ModernChrome {
  /** Custom title line ("" = no header text). */
  label?: string;
  /** A key from `lib/widget-icons.ts` ("" = no icon). */
  icon?: string;
  /** Accent color for fills / the header icon ("" = auto). */
  accent?: string;
  /** Background image URL. */
  background?: string;
  /** Use `background` behind the surface. */
  backgroundOn?: boolean;
}

export function ModernChrome({
  chrome,
  children,
}: {
  chrome?: ModernChrome;
  children: ReactNode;
}) {
  const Icon = chrome?.icon ? widgetIcon(chrome.icon) : undefined;
  const showHeader = Boolean(Icon || chrome?.label);
  const showBackground = Boolean(chrome?.backgroundOn && chrome?.background);

  return (
    <div
      className="relative h-full w-full"
      style={
        chrome?.accent
          ? ({ "--wp-accent": chrome.accent } as CSSProperties)
          : undefined
      }
    >
      {showBackground && (
        <>
          <img
            src={chrome!.background!}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/45" />
        </>
      )}
      <div className="relative z-10 h-full w-full">{children}</div>
      {showHeader && (
        <div className="absolute left-3 top-2 z-20 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-foreground/75">
          {Icon && (
            <Icon
              className="h-3.5 w-3.5"
              style={chrome?.accent ? { color: chrome.accent } : undefined}
            />
          )}
          {chrome?.label ? chrome.label : null}
        </div>
      )}
    </div>
  );
}
