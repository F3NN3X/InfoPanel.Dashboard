import { memo } from "react";
import { Monitor } from "lucide-react";
import type { MonitorProfile, ProfilePage } from "@/lib/layout";
import { resolveTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

/**
 * A page drawn as a schematic: its visible placements as rounded boxes on the screen's own background, scaled from the
 * grid's cells into the screen's size and letterboxed at its aspect. Synchronous, so a card has an identity before any
 * screenshot exists (Screens' cards and their page strip). A page with nothing visible keeps the monitor glyph.
 */
export const PageMap = memo(function PageMap({ profile, page, className }: { profile: MonitorProfile; page: ProfilePage | undefined; className?: string }) {
  const placements = page?.placements.filter((z) => z.visible) ?? [];
  const cw = profile.width / profile.cols;
  const ch = profile.height / profile.rows;
  return (
    <div aria-hidden className={cn("relative grid h-full w-full place-items-center", className)} style={{ background: `hsl(${resolveTheme(profile).tokens.background})` }}>
      {placements.length > 0 ? (
        <svg viewBox={`0 0 ${profile.width} ${profile.height}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          {placements.map((z) => (
            <rect
              key={z.id}
              x={(z.colStart - 1) * cw + 2}
              y={(z.rowStart - 1) * ch + 2}
              width={Math.max(z.colSpan * cw - 4, 1)}
              height={Math.max(z.rowSpan * ch - 4, 1)}
              rx={Math.min(cw, ch) * 0.08}
              className="fill-ui-active stroke-ui-edge"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      ) : (
        <Monitor className="h-6 w-6 text-ui-1 opacity-20" strokeWidth={1.5} />
      )}
    </div>
  );
});
