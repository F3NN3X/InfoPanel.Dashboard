// Connectors (D20): lines the app draws between two widgets of a page, styled by the pack (`line` or `elbow`, an optional end
// dot). The pack never says where they go: the page gives pairs of zone ids (a template with roles, P11) and the layer measures
// the zones, so a connector follows the grid and never moves a widget. Decoration: click-through, `aria-hidden`.
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { PackConnectors } from "./pack";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A connector from the edge of `a` to the edge of `b` that face each other: the side by the larger gap. Elbows bend once at the middle. */
export function connectorPath(a: Rect, b: Rect, style: PackConnectors["style"]): { d: string; from: [number, number]; to: [number, number] } {
  const gapX = Math.max(b.x - (a.x + a.width), a.x - (b.x + b.width));
  const gapY = Math.max(b.y - (a.y + a.height), a.y - (b.y + b.height));
  const horizontal = gapX >= gapY;
  const cx = (r: Rect) => r.x + r.width / 2;
  const cy = (r: Rect) => r.y + r.height / 2;
  const from: [number, number] = horizontal ? [b.x > a.x ? a.x + a.width : a.x, cy(a)] : [cx(a), b.y > a.y ? a.y + a.height : a.y];
  const to: [number, number] = horizontal ? [b.x > a.x ? b.x : b.x + b.width, cy(b)] : [cx(b), b.y > a.y ? b.y : b.y + b.height];
  if (style === "line") return { d: `M${from[0]} ${from[1]}L${to[0]} ${to[1]}`, from, to };
  const mid = horizontal ? (from[0] + to[0]) / 2 : (from[1] + to[1]) / 2;
  const d = horizontal ? `M${from[0]} ${from[1]}H${mid}V${to[1]}H${to[0]}` : `M${from[0]} ${from[1]}V${mid}H${to[0]}V${to[1]}`;
  return { d, from, to };
}

/** `deco` and `style` carry the stage's burn-in protection (drift, dim), so the lines move and fade with the page layers. */
export default function ConnectorLayer({ links, connectors, className = "", deco = "", style }: { links: readonly (readonly [string, string])[]; connectors: PackConnectors; className?: string; deco?: string; style?: CSSProperties }) {
  const ref = useRef<SVGSVGElement>(null);
  const [rects, setRects] = useState<Map<string, Rect>>(new Map());
  useLayoutEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const measure = () => {
      const origin = svg.getBoundingClientRect();
      const next = new Map<string, Rect>();
      for (const id of new Set(links.flat())) {
        const el = document.querySelector(`[data-zone-id="${CSS.escape(id)}"]`);
        const r = el?.getBoundingClientRect();
        if (r) next.set(id, { x: r.left - origin.left, y: r.top - origin.top, width: r.width, height: r.height });
      }
      setRects(next);
    };
    measure();
    const watch = new ResizeObserver(measure);
    watch.observe(svg);
    return () => watch.disconnect();
  }, [links]);
  return (
    <svg ref={ref} aria-hidden data-pack-deco={deco} data-pack-connectors="" className={`pointer-events-none ${className}`} style={style} fill="none" stroke="var(--w-accent, currentColor)" strokeWidth={1.5} strokeOpacity={0.6}>
      {links.map(([from, to]) => {
        const a = rects.get(from);
        const b = rects.get(to);
        if (!a || !b) return null;
        const p = connectorPath(a, b, connectors.style);
        return (
          <g key={`${from}>${to}`}>
            <path d={p.d} />
            {connectors.dot && <circle cx={p.to[0]} cy={p.to[1]} r={3} fill="var(--w-accent, currentColor)" stroke="none" />}
          </g>
        );
      })}
    </svg>
  );
}
