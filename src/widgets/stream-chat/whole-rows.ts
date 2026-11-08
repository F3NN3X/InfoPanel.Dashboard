import { useLayoutEffect, useRef, type RefObject } from "react";

/** How many of the newest rows fit `avail` px whole, `heights` oldest first and `gap` px apart; at least one (a taller row is shown clipped). */
export function wholeRows(heights: number[], avail: number, gap: number): number {
  let used = 0;
  let n = 0;
  for (let i = heights.length - 1; i >= 0; i--) {
    used += heights[i] + (n ? gap : 0);
    if (used > avail) break;
    n++;
  }
  return Math.min(heights.length, Math.max(1, n));
}

/**
 * Hides the oldest children of `ref` until the rest fit its height whole, so the list never shows half a message.
 * `listed` is whether the list is in the page (it is not while the empty state shows), so the observer follows it.
 * Messages wrap, so the rows are measured (to the fraction of a px) rather than counted at one height. It fits after every render,
 * when the list resizes, and when something inside it (an emote image) finishes loading.
 */
export function useWholeRows(ref: RefObject<HTMLElement | null>, gap: number, listed: boolean): void {
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    for (const k of kids) k.style.display = "";
    const keep = wholeRows(kids.map((k) => k.getBoundingClientRect().height), el.getBoundingClientRect().height, gap);
    kids.forEach((k, i) => {
      if (i < kids.length - keep) k.style.display = "none";
    });
  };
  const latest = useRef(fit);
  latest.current = fit;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const again = () => latest.current();
    const ro = new ResizeObserver(again);
    ro.observe(el);
    // image loads do not bubble, so listen in the capture phase
    el.addEventListener("load", again, true);
    return () => {
      ro.disconnect();
      el.removeEventListener("load", again, true);
    };
  }, [ref, listed]);
  useLayoutEffect(fit);
}
