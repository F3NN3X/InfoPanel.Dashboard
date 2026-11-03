import { useCallback, useEffect, useRef, useState } from "react";

/** How long the pointer or focus rests on a tab before its thumbnail shows. */
export const THUMB_DELAY_MS = 350;
export const THUMB_W = 176;
const GAP = 6;

interface Anchor {
  id: string;
  left: number;
  top: number;
}

/** Where a thumbnail under `rect` sits: left-aligned to the tab, kept inside the window. */
export function thumbAt(rect: { left: number; bottom: number }, viewportW: number): { left: number; top: number } {
  return { left: Math.max(GAP, Math.min(rect.left, viewportW - THUMB_W - GAP)), top: rect.bottom + GAP };
}

/**
 * The page tabs' hover thumbnail: `show` it for a tab after a short rest (hover or keyboard focus), `hide` it on leave,
 * blur or Escape. One at a time; `open` is the page it is showing.
 */
export function usePageThumb() {
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setAnchor(null);
  }, []);
  const show = useCallback((id: string, el: Element) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAnchor({ id, ...thumbAt(el.getBoundingClientRect(), window.innerWidth) }), THUMB_DELAY_MS);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return { anchor, show, hide };
}
