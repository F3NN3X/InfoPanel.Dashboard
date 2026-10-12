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
/** The bottom dock's top row (collapse toggle): all that shows while it is collapsed. */
export const BAR_H = 28;

/** The bottom dock's height until the user drags the splitter. */
export const DEFAULT_DOCK = 320;
/** The dock never gets smaller than this (it holds the inspector). */
export const MIN_DOCK = 200;
/** ... nor larger than this share of the studio body. */
export const MAX_DOCK_SHARE = 0.7;
/** Auto puts the inspector below the canvas for a profile wider than this width / height ratio. */
export const AUTO_BOTTOM_ASPECT = 2.5;

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
  /** Width of the open left panel (beside the canvas in both placements). */
  drawer?: number;
  /** The profile's design size, for Auto: a wide strip goes below the canvas. */
  design?: Size;
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

/** The mode after `mode` in the zoom bar's dock button: Auto → Side → Bottom → Auto. */
export function nextLayoutMode(mode: LayoutMode): LayoutMode {
  return mode === "auto" ? "side" : mode === "side" ? "bottom" : "auto";
}

/** Where Auto puts the inspector: Bottom for a profile wider than 2.5 : 1, else Side. */
export function autoPlacement(design?: Size): Placement {
  return design && design.height > 0 && design.width / design.height > AUTO_BOTTOM_ASPECT ? "bottom" : "side";
}

/** The narrowest canvas the studio keeps (the shell's `main` min width). */
export const MIN_CANVAS = 420;

/** Where the inspector goes for a mode, before any measuring. */
export function placementFor(mode: LayoutMode, design?: Size, forceSide = false): Placement {
  if (forceSide || mode === "side") return "side";
  return mode === "bottom" ? "bottom" : autoPlacement(design);
}

/**
 * Whether the open left panel fits beside the canvas (and a side inspector).
 * When it does not, the shell lays it over the canvas instead of squeezing
 * the canvas below its minimum and scrolling the studio sideways. An
 * unmeasured body (width 0) counts as fitting.
 */
export function leftPanelFits(bodyWidth: number, placement: Placement, widths: { rail: number; drawer: number; inspector: number }): boolean {
  if (bodyWidth <= 0 || widths.drawer <= 0) return true;
  const need = widths.rail + widths.drawer + MIN_CANVAS + (placement === "side" ? widths.inspector : 0);
  return bodyWidth >= need;
}

/** Compute the placement, dock and canvas boxes, and the fit zoom. */
export function computeLayout(input: LayoutInput): StudioLayout {
  const { body, page, rail, drawer = 0, inspector, mode, design, dockHeight, collapsed } = input;
  const side = (): StudioLayout => {
    const box = {
      width: Math.max(0, body.width - rail - drawer - inspector - RULER_W),
      height: Math.max(0, body.height - RULER_H),
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
  if (mode === "auto" && autoPlacement(design) === "side") return side();

  const width = Math.max(0, body.width - rail - drawer - RULER_W);
  const dock = collapsed ? BAR_H : clampDock(dockHeight != null && dockHeight > 0 ? dockHeight : DEFAULT_DOCK, body.height);
  const box = { width, height: Math.max(0, body.height - dock - RULER_H) };
  return {
    placement: "bottom",
    dockHeight: dock,
    canvasWidth: box.width,
    canvasHeight: box.height,
    fitZoom: fitZoomFor(box, page),
  };
}
