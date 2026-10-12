import { useCallback, useEffect, useRef, useState } from "react";
import { fitZoomFor } from "./studio-layout";

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
 * and a sticky fit. While `fitting` (the default) the zoom is whatever fits
 * the profile's page (`page.height` 0 = width only) into the canvas, and
 * follows the container and the profile; any manual zoom turns it off and
 * `fitZoom` turns it back on. Attach the scroll container with
 * `attachScroll` (a callback ref: the canvas remounts after a Sources
 * round-trip and the wheel listener must follow it); read it through
 * `scrollRef`.
 */
export function useCanvasZoom(page: { width: number; height: number }) {
  const [manual, setManual] = useState(1);
  const [fitting, setFitting] = useState(true);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    setScrollEl(el);
  }, []);

  // The fit follows the scroll container's size.
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [scrollEl]);

  const fitted = fitZoomFor(box, page);
  // Before the first measurement there is nothing to fit to yet.
  const zoom = fitting && box.width > 0 ? fitted : manual;

  /** Zoom manually: leaves the fit. */
  const setZoom = useCallback((z: number) => {
    setFitting(false);
    setManual(z);
  }, []);

  // Ctrl/cmd + wheel zooms the canvas, from the zoom on screen.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = scrollEl;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      // Advance the ref too: several wheel events can land before a render.
      zoomRef.current = stepZoom(zoomRef.current, e.deltaY < 0 ? 1 : -1);
      setZoom(zoomRef.current);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [scrollEl, setZoom]);

  const zoomStep = (dir: 1 | -1) => setZoom(stepZoom(zoom, dir));

  /** Fit the page to the canvas and keep it fitted. */
  const fitZoom = () => setFitting(true);

  return { zoom, fitting, setZoom, zoomStep, fitZoom, scrollRef, attachScroll };
}
