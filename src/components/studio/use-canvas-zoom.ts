import { useCallback, useEffect, useRef, useState } from "react";

const ZOOM_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

/** The next zoom step in `dir` (an off-step zoom counts as 100%). */
function stepZoom(z: number, dir: number): number {
  const i = ZOOM_STEPS.indexOf(z);
  return ZOOM_STEPS[
    Math.max(0, Math.min(ZOOM_STEPS.length - 1, (i === -1 ? 3 : i) + dir))
  ];
}

/**
 * Canvas zoom: discrete steps, ctrl/cmd + wheel over the scroll container,
 * and fit-to-width for the profile's design width. Attach the scroll
 * container with `attachScroll` (a callback ref: the canvas remounts after
 * a Sources round-trip and the wheel listener must follow it); read it
 * through `scrollRef`.
 */
export function useCanvasZoom(designWidth: number) {
  const [zoom, setZoom] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    setScrollEl(el);
  }, []);

  // Ctrl/cmd + wheel zooms the canvas.
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      setZoom((z) => stepZoom(z, e.deltaY < 0 ? 1 : -1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollEl]);

  const zoomStep = (dir: 1 | -1) => setZoom((z) => stepZoom(z, dir));

  /** Zoom so the profile's design width fits the canvas viewport. */
  const fitZoom = () => {
    const el = scrollRef.current;
    if (!el || designWidth <= 0) return;
    const z = (el.clientWidth - 32) / designWidth;
    setZoom(Math.max(0.25, Math.min(2, Math.round(z * 100) / 100)));
  };

  return { zoom, setZoom, zoomStep, fitZoom, scrollRef, attachScroll };
}
