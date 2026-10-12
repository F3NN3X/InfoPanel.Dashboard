// Sizing: size tiers, grid-span shapes, element measurement and eased value history.
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { Shape, Tier } from "./types";

/* ───────── sizing ─────────
   Every widget measures itself and picks a layout tier.
   xs < 220×140 ≤ sm < 340×210 ≤ md < 500×320 ≤ lg */
// Measured on the widget's outer (border-box) size so padding changes can never feed back into the tier.
export const tierOf = (w: number, h: number): Tier =>
  w < 220 || h < 140 ? "xs" : w < 340 || h < 210 ? "sm" : w < 500 || h < 320 ? "md" : "lg";
// Shape follows the zone's grid span: 1×1 → tile, 3×1 / 4×1 → strip, 1×2 / 1×3 → column, everything else → box.
export const shapeOf = (w: number, h: number): Shape => {
  if (!w || !h) return "box";
  const r = w / h;
  if (r >= 2.6 && h < 240) return "strip";
  if (r <= 0.62 && w < 260) return "column";
  if (w < 240 && h < 240) return "tile";
  return "box";
};

export interface Box {
  w: number;
  h: number;
  size: Tier;
  shape: Shape;
}

/**
 * The box a widget lays out in. `zoom` is the shell's CSS zoom: the zoomed content sees the
 * measured size divided by it, so tier and shape are taken from that size.
 */
export const boxOf = (w: number, h: number, forced: Tier | "auto" | undefined, zoom = 1): Box => {
  const zw = w / zoom,
    zh = h / zoom;
  return { w: zw, h: zh, size: forced && forced !== "auto" ? forced : tierOf(zw, zh), shape: shapeOf(zw, zh) };
};

export function useBox(forced: Tier | "auto" | undefined, zoom = 1): [RefObject<HTMLDivElement | null>, Box] {
  const ref = useRef<HTMLDivElement | null>(null);
  const [outer, setOuter] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const bb = e.borderBoxSize?.[0];
      const w = bb ? bb.inlineSize : el.offsetWidth,
        h = bb ? bb.blockSize : el.offsetHeight;
      setOuter((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const box = outer.w || outer.h ? boxOf(outer.w, outer.h, forced, zoom) : { w: 0, h: 0, size: forced && forced !== "auto" ? forced : "md", shape: "box" as Shape };
  return [ref, box];
}

export const pickBy = <T,>(size: Tier, map: Partial<Record<Tier, T>> & { md: T }): T => map[size] ?? map.md;

/**
 * One step of an eased (EMA) history: the next history after `value` arrives. Returns `hist`
 * unchanged for a non-finite value. A first value seeds two points so a graph has a line.
 */
export function easeHistory(hist: number[], value: number, len = 48, ease = 0.45): number[] {
  if (!Number.isFinite(value)) return hist;
  const prev = hist.length ? hist[hist.length - 1] : value;
  const v = prev + (value - prev) * ease;
  return (hist.length ? [...hist, v] : [v, v]).slice(-len);
}

// Rolling history, eased (EMA) so graphs glide instead of jitter. ease 1 = raw.
export function useHistory(value: number, len = 48, ease = 0.45): number[] {
  const ref = useRef<number[]>([]);
  const last = useRef<number | undefined>(undefined);
  if (Number.isFinite(value) && value !== last.current) {
    ref.current = easeHistory(ref.current, value, len, ease);
    last.current = value;
  }
  return ref.current;
}
