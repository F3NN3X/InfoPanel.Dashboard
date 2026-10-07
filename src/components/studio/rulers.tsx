/**
 * Figma-style rulers for the studio canvas. Positions are computed in
 * design (unscaled) px and mapped to the screen through the canvas zoom
 * and the current scroll offset.
 */

const STEPS = [10, 20, 25, 50, 100, 200, 500, 1000, 2000, 5000];

function stepFor(minScreen: number, zoom: number) {
  for (const s of STEPS) if (s * zoom >= minScreen) return s;
  return 10000;
}

interface RulerProps {
  /** Content length in design px (unscaled). */
  length: number;
  zoom: number;
  /** Screen px scrolled away from the content origin. */
  offset: number;
  /** Visible length of the ruler in screen px. */
  view: number;
}

function ticks(length: number, zoom: number, offset: number, view: number) {
  const step = stepFor(64, zoom);
  const minor = step / 5;
  const i0 = Math.max(0, Math.floor(offset / zoom / minor));
  const i1 = Math.min(
    Math.ceil(length / minor),
    Math.ceil((offset + view) / zoom / minor)
  );
  const out: { x: number; major: boolean }[] = [];
  for (let i = i0; i <= i1; i++) {
    out.push({ x: Math.round(i * minor), major: i % 5 === 0 });
  }
  return { out, showLabels: step * zoom >= 56 };
}

export function RulerH({ length, zoom, offset, view }: RulerProps) {
  const { out, showLabels } = ticks(length, zoom, offset, view);
  return (
    <div className="relative h-6 select-none overflow-hidden border-b border-border bg-popover/60">
      {out.map((t) => (
        <div
          key={t.x}
          className="absolute bottom-0"
          style={{ left: t.x * zoom - offset }}
        >
          {t.major ? (
            <>
              <div className="h-2.5 w-px bg-muted-foreground/60" />
              {showLabels && (
                <div className="absolute -top-0.5 left-1 text-[10px] leading-none tabular-nums text-muted-foreground/70">
                  {t.x}
                </div>
              )}
            </>
          ) : (
            <div className="h-1.5 w-px bg-muted-foreground/30" />
          )}
        </div>
      ))}
    </div>
  );
}

export function RulerV({ length, zoom, offset, view }: RulerProps) {
  const { out, showLabels } = ticks(length, zoom, offset, view);
  return (
    <div className="relative w-7 shrink-0 select-none overflow-hidden border-r border-border bg-popover/60">
      {out.map((t) => (
        <div
          key={t.x}
          className="absolute left-0"
          style={{ top: t.x * zoom - offset }}
        >
          {t.major ? (
            <>
              <div className="h-px w-2 bg-muted-foreground/60" />
              {showLabels && (
                <div className="absolute left-2.5 top-1 text-[10px] leading-none tabular-nums text-muted-foreground/70">
                  {t.x}
                </div>
              )}
            </>
          ) : (
            <div className="h-px w-1.5 bg-muted-foreground/30" />
          )}
        </div>
      ))}
    </div>
  );
}
