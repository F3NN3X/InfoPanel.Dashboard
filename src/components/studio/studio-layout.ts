/**
 * The studio's responsive layout: where the inspector lives (beside the
 * canvas or in a dock under it) and the zoom that fits the page. Pure, so
 * the shell only measures and renders.
 */

export type LayoutMode = "auto" | "side" | "bottom";
export type Placement = "side" | "bottom";

export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 2;

/** Padding around the page inside the canvas (`p-4` both sides; scales with zoom). */
export const CANVAS_PAD = 32;
/** The vertical ruler's width and the horizontal ruler's height. */
export const RULER_W = 28;
export const RULER_H = 24;
/** The strip under the canvas (zoom, layout switch): a footer beside it, the dock's top row in the dock. */
export const BAR_H = 36;

/** The dock never gets smaller than this (it holds the inspector). */
export const MIN_DOCK = 200;
/** ... nor larger than this share of the studio body. */
export const MAX_DOCK_SHARE = 0.7;
/** Auto switches to the dock when the page leaves this share of the body free ... */
export const AUTO_FREE_SHARE = 0.35;
/** ... and the dock would get at least this much. */
export const AUTO_MIN_DOCK = 220;

interface Size {
  width: number;
  height: number;
}

/** The profile's page: `height` is 0 for a scroll profile. */
export interface PageSize extends Size {
  /** A scroll profile's grid height at its natural size, when known. */
  naturalHeight?: number;
}

export interface LayoutInput {
  /** The studio body (below the top bar). */
  body: Size;
  page: PageSize;
  /** Width of the rail. */
  rail: number;
  /** Width of the open drawer: beside the canvas only (the dock holds it below). */
  drawer?: number;
  /** Width of the side inspector. */
  inspector: number;
  mode: LayoutMode;
  /** The user's dock height (dragged splitter), if any. */
  dockHeight?: number | null;
  /** The dock is collapsed to its bar (bottom placement only). */
  collapsed?: boolean;
}

export interface StudioLayout {
  placement: Placement;
  /** Height of the bottom dock (0 in the side placement). */
  dockHeight: number;
  /** The canvas scroll box (inside the rulers). */
  canvasWidth: number;
  canvasHeight: number;
  fitZoom: number;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

/**
 * The largest zoom at which the page and its padding fit a canvas box.
 * A page without a height (scroll profile) is fitted to the width only.
 */
export function fitZoomFor(box: Size, page: Size): number {
  const limits: number[] = [];
  if (page.width > 0) limits.push(box.width / (page.width + CANVAS_PAD));
  if (page.height > 0) limits.push(box.height / (page.height + CANVAS_PAD));
  if (limits.length === 0) return 1;
  const z = Math.min(...limits);
  if (!(z > 0)) return ZOOM_MIN;
  // Floor to 1% so the page never overshoots the box.
  return clamp(Math.floor(z * 100) / 100, ZOOM_MIN, ZOOM_MAX);
}

/** The dock height (its bar included) clamped to [MIN_DOCK, MAX_DOCK_SHARE of the body]. */
export function clampDock(height: number, bodyHeight: number): number {
  return Math.round(clamp(height, MIN_DOCK, Math.max(MIN_DOCK, bodyHeight * MAX_DOCK_SHARE)));
}

/** Compute the placement, dock and canvas boxes, and the fit zoom. */
export function computeLayout(input: LayoutInput): StudioLayout {
  const { body, page, rail, drawer = 0, inspector, mode, dockHeight, collapsed } = input;
  const side = (): StudioLayout => {
    const box = {
      width: Math.max(0, body.width - rail - drawer - inspector - RULER_W),
      height: Math.max(0, body.height - RULER_H - BAR_H),
    };
    return {
      placement: "side",
      dockHeight: 0,
      canvasWidth: box.width,
      canvasHeight: box.height,
      fitZoom: fitZoomFor(box, page),
    };
  };
  if (body.width <= 0 || body.height <= 0 || mode === "side") return side();

  // The canvas without the inspector beside it, and the page fitted to its width.
  const width = Math.max(0, body.width - rail - RULER_W);
  const pageHeight = page.height > 0 ? page.height : (page.naturalHeight ?? 0);
  const widthZoom = fitZoomFor({ width, height: 0 }, { width: page.width, height: 0 });
  const needed = pageHeight > 0 ? (pageHeight + CANVAS_PAD) * widthZoom + RULER_H : 0;
  const free = body.height - needed;

  if (mode === "auto") {
    // An unknown page height can't be judged: stay beside the canvas.
    if (pageHeight <= 0) return side();
    if (free < body.height * AUTO_FREE_SHARE || free < AUTO_MIN_DOCK) return side();
  }

  const wanted =
    dockHeight != null && dockHeight > 0
      ? dockHeight
      : pageHeight > 0
        ? free
        : body.height * AUTO_FREE_SHARE;
  const dock = collapsed ? BAR_H : clampDock(wanted, body.height);
  const box = { width, height: Math.max(0, body.height - dock - RULER_H) };
  return {
    placement: "bottom",
    dockHeight: dock,
    canvasWidth: box.width,
    canvasHeight: box.height,
    fitZoom: fitZoomFor(box, page),
  };
}
