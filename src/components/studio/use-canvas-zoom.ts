import { useCallback, useEffect, useRef, useState } from "react";
import { FIT_MIN, ZOOM_MAX, fitZoomFor, stepZoom, type CanvasInset } from "./studio-layout";
import { useHandPan } from "./use-hand-pan";
import { useStorageKey } from "./use-stored-flag";
import { loadZoomPref, parseZoomPref, saveZoomPref, ZOOM_KEY } from "./zoom-pref";

/**
 * Canvas zoom: discrete steps, ctrl/cmd + wheel over the scroll container (the hand tool pans it: see useHandPan),
 * and a sticky fit. While `fitting` (the default) the zoom is whatever fits
 * the profile's page (`page.height` 0 = width only) into the canvas, and
 * follows the container and the profile; any manual zoom turns it off and
 * `fitZoom` turns it back on. Attach the scroll container with
 * `attachScroll` (a callback ref: the canvas remounts after a Sources
 * round-trip and the wheel listener must follow it); read it through
 * `scrollRef`. The fit keeps the page clear of `inset` (the open floating
 * inspector).
 */
export function useCanvasZoom(page: { width: number; height: number }, inset: CanvasInset = {}) {
  // The zoom mode (fit, or a manual zoom) is remembered across reloads.
  const [initial] = useState(loadZoomPref);
  const [manual, setManual] = useState(initial.manual);
  const [fitting, setFitting] = useState(initial.fitting);
  useEffect(() => saveZoomPref({ fitting, manual }), [fitting, manual]);
  // Settings › Studio's Default zoom, set in the Settings window.
  useStorageKey(ZOOM_KEY, (raw) => {
    const pref = parseZoomPref(raw);
    setFitting(pref.fitting);
    setManual(pref.manual);
  });
  const [box, setBox] = useState({ width: 0, height: 0 });
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((el: HTMLDivElement | null) => {
    scrollRef.current = el;
    setScrollEl(el);
  }, []);
  /** The toolbar's Pan: the left button pans until Select. */
  const [handTool, setHandTool] = useState(false);
  const { pan, resetPan } = useHandPan(scrollEl, handTool);
  // A new page size (another profile, a resize) starts centred again.
  useEffect(resetPan, [page.width, page.height, resetPan]);

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

  const fitted = fitZoomFor(box, page, inset);
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

  /** Fit the page to the canvas and keep it fitted; the pan goes back to centre. */
  const fitZoom = () => {
    setFitting(true);
    resetPan();
  };

  /** Zoom so `el` (a box on the page) fills ~70% of the canvas, then scroll it to the middle. */
  const zoomToElement = (el: Element | null) => {
    if (!el || box.width <= 0 || box.height <= 0) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    // The box in the page's own px, whatever the zoom now.
    const [w, h] = [r.width / zoom, r.height / zoom];
    const next = Math.min(ZOOM_MAX, Math.max(FIT_MIN, Math.floor(Math.min((box.width * 0.7) / w, (box.height * 0.7) / h) * 100) / 100));
    resetPan();
    setZoom(next);
    // The page is laid out at the new zoom a frame later.
    requestAnimationFrame(() => requestAnimationFrame(() => el.scrollIntoView({ block: "center", inline: "center" })));
  };

  return { zoom, fitting, setZoom, zoomStep, fitZoom, zoomToElement, pan, scrollRef, attachScroll, handTool, setHandTool };
}
