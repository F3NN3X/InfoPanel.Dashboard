// Sizing: size tiers, grid-span shapes, element measurement and eased value history.
import React, { useLayoutEffect, useRef, useState } from 'react';

/* ───────── sizing ─────────
   Every widget measures itself and picks a layout tier.
   xs < 200×120 ≤ sm < 320×190 ≤ md < 480×300 ≤ lg */
// Measured on the widget's outer (border-box) size so padding changes can never feed back into the tier.
export const tierOf = (w, h) => (w < 220 || h < 140 ? 'xs' : w < 340 || h < 210 ? 'sm' : w < 500 || h < 320 ? 'md' : 'lg');
// Shape follows the zone's grid span: 1×1 → tile, 3×1 / 4×1 → strip, 1×2 / 1×3 → column, everything else → box.
export const shapeOf = (w, h) => {
  if (!w || !h) return 'box';
  const r = w / h;
  if (r >= 2.6 && h < 240) return 'strip';
  if (r <= 0.62 && w < 260) return 'column';
  if (w < 240 && h < 240) return 'tile';
  return 'box';
};
export function useBox(forced) {
  const ref = useRef(null);
  const [box, set] = useState({ w: 0, h: 0, size: forced && forced !== 'auto' ? forced : 'md', shape: 'box' });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const bb = e.borderBoxSize?.[0];
      const w = bb ? bb.inlineSize : el.offsetWidth, h = bb ? bb.blockSize : el.offsetHeight;
      set({ w, h, size: forced && forced !== 'auto' ? forced : tierOf(w, h), shape: shapeOf(w, h) });
    });
    ro.observe(el); return () => ro.disconnect();
  }, [forced]);
  return [ref, box];
}
export const pickBy = (size, map) => map[size] ?? map.md;
// Rolling history, eased (EMA) so graphs glide instead of jitter. ease 1 = raw.
export function useHistory(value, len = 48, ease = 0.45) {
  const ref = useRef([]);
  const last = useRef();
  if (Number.isFinite(value) && value !== last.current) {
    const prev = ref.current.length ? ref.current[ref.current.length - 1] : value;
    const v = prev + (value - prev) * ease;
    ref.current = (ref.current.length ? [...ref.current, v] : [v, v]).slice(-len); last.current = value;
  }
  return ref.current;
}
