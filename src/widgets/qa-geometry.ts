// Pure geometry for the widget QA probe (`?widget-qa`); no DOM, so it is unit-testable.
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** How far `rect` pokes out of `box` on each axis, in px beyond `tol` (0 = inside). */
export function exceeds(rect: Box, box: Box, tol = 1): { dx: number; dy: number } {
  const out = (lo: number, hi: number, boxLo: number, boxHi: number) => {
    const before = boxLo - lo;
    const after = hi - boxHi;
    const worst = Math.max(before, after);
    return worst > tol ? Math.round(worst * 10) / 10 : 0;
  };
  return { dx: out(rect.left, rect.right, box.left, box.right), dy: out(rect.top, rect.bottom, box.top, box.bottom) };
}

/** The intersection area of two rects when it exceeds `tol` px², else 0. */
export function overlaps(a: Box, b: Box, tol = 2): number {
  const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  if (w <= 0 || h <= 0) return 0;
  const area = w * h;
  return area > tol ? Math.round(area * 10) / 10 : 0;
}

export interface ClipInput {
  tag: string;
  overflowX: string;
  overflowY: string;
  textOverflow: string;
  whiteSpace: string;
  /** `-webkit-line-clamp`: "none" unless the text is clamped on purpose. */
  lineClamp?: string;
  scrollWidth: number;
  clientWidth: number;
  scrollHeight: number;
  clientHeight: number;
}

/** How much content an overflow-hidden/clip element hides per axis (px beyond `tol`); 0 = nothing cut off. */
export function clippedContent(el: ClipInput, tol = 1): { dx: number; dy: number } {
  if (["canvas", "img", "svg", "video"].includes(el.tag.toLowerCase())) return { dx: 0, dy: 0 };
  if (el.textOverflow === "ellipsis" && el.whiteSpace === "nowrap") return { dx: 0, dy: 0 };
  if (el.lineClamp && el.lineClamp !== "none") return { dx: 0, dy: 0 };
  const clips = (o: string) => o === "hidden" || o === "clip";
  const hidden = (scroll: number, client: number) => (scroll > client + tol ? scroll - client : 0);
  return {
    dx: clips(el.overflowX) ? hidden(el.scrollWidth, el.clientWidth) : 0,
    dy: clips(el.overflowY) ? hidden(el.scrollHeight, el.clientHeight) : 0,
  };
}
