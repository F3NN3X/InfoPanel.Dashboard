import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ModernChrome } from "./modern-chrome";
import { surfaceColors, surfaceTokens } from "./surfaces";
import { surfaceBox, ws } from "./widget-style";

/**
 * The card of the plain widgets (the legacy modules and the catch-all
 * sensor cards) on the style system: its surface ("theme" — the shadcn
 * card — by default) with the border, glow, opacity and blur options, the
 * corner radius and the text color. Content inside reads the theme tokens
 * (`text-foreground`, `text-muted-foreground`, …), which the widget's
 * colors re-scope (`tokenScope`) and a fixed-palette surface sets to its
 * own text colors (`surfaceTokens`).
 */
export function StyledCard({
  surface,
  chrome,
  className,
  style,
  children,
}: {
  /** The resolved `surface` setting. */
  surface: unknown;
  chrome: ModernChrome | undefined;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const sv = surfaceColors(surface);
  return (
    <div
      className={cn("wp-card flex min-h-0 min-w-0 flex-col overflow-hidden", className)}
      style={{
        ...(surfaceTokens(surface, chrome) as CSSProperties),
        // The surface's text color already yields to the user's (`var(--wp-fg, …)`).
        ...surfaceBox(sv, chrome),
        borderRadius: ws.radius("var(--radius-lg, 0.5rem)"),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A card title's icon in the accent color (else the title's own). */
export const accentIcon: CSSProperties = { color: "var(--wp-accent, currentColor)" };
