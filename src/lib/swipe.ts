/** A swipe must travel this far, in px, horizontally. */
export const SWIPE_MIN_PX = 60;
/** ... and finish within this time, in ms. */
export const SWIPE_MAX_MS = 600;

/**
 * What a pointer gesture means on the kiosk: swiping left shows the next
 * page, right the previous. It must be long enough, quick, and mostly
 * horizontal (so a vertical scroll never counts); null otherwise.
 */
export function swipeDirection(g: { dx: number; dy: number; ms: number }): "next" | "prev" | null {
  if (g.ms >= SWIPE_MAX_MS || Math.abs(g.dx) < SWIPE_MIN_PX) return null;
  if (Math.abs(g.dx) < Math.abs(g.dy) * 2) return null;
  return g.dx < 0 ? "next" : "prev";
}
