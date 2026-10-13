import { useCallback, useEffect, useMemo, useState } from "react";
import { SCROLL_ROW_H, type ProfileView } from "@/lib/layout";
import { profileGap, profilePadding } from "@/lib/profile-grid";
import {
  computeLayout,
  nextLayoutMode,
  leftPanelFits,
  placementFor,
  type LayoutMode,
  type PageSize,
  type StudioLayout,
} from "./studio-layout";

/** localStorage keys: the layout mode, the dragged dock height and whether the dock is collapsed. */
const MODE_KEY = "studio.layout";
const DOCK_KEY = "studio.dockHeight";
const COLLAPSED_KEY = "studio.dockCollapsed";

/** Width of the side inspector. */
export const INSPECTOR_WIDTH = 340;
/** Width of the icon rail and of the open left panel (`w-64`). */
export const RAIL_WIDTH = 52;
export const DRAWER_WIDTH = 256;

/** The stored layout mode; anything unknown = auto. */
export function parseMode(raw: string | null): LayoutMode {
  return raw === "side" || raw === "bottom" ? raw : "auto";
}

/** The stored dock height; anything but a positive number = none. */
export function parseDock(raw: string | null): number | null {
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The profile's page as the canvas draws it: a "fill" page has its design
 * height, a scroll page the height of its grid at the natural row size.
 */
export function pageSize(profile: ProfileView): PageSize {
  const fill = profile.fit === "fill" && profile.height > 0;
  const gap = profileGap(profile);
  return {
    width: profile.width,
    height: fill ? profile.height : 0,
    naturalHeight: fill
      ? undefined
      : 2 * profilePadding(profile, true) + profile.rows * SCROLL_ROW_H + (profile.rows - 1) * gap,
  };
}

function load<T>(key: string, parse: (raw: string | null) => T): T {
  try {
    return parse(localStorage.getItem(key));
  } catch {
    return parse(null);
  }
}

function store(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota): keep the session state.
  }
}

interface StudioLayoutOptions {
  page: PageSize;
  /** Width of the rail. */
  rail: number;
  /** Width of the open left panel. */
  drawer: number;
  /** The profile's design size (Auto picks Bottom for a wide strip). */
  design: { width: number; height: number };
  /** The inspector stays beside the canvas (Sources view). */
  forceSide?: boolean;
}

/**
 * The studio's layout: measures the body (below the top bar) through the
 * `bodyRef` callback ref and works out where the inspector goes. The mode
 * and a dragged dock height are remembered per viewer.
 */
export function useStudioLayout({ page, rail, drawer, design, forceSide }: StudioLayoutOptions) {
  const [mode, setModeState] = useState<LayoutMode>(() => load(MODE_KEY, parseMode));
  const [dock, setDockState] = useState<number | null>(() => load(DOCK_KEY, parseDock));
  const [collapsed, setCollapsedState] = useState(() => load(COLLAPSED_KEY, (raw) => raw === "1"));
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [body, setBody] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!bodyEl) return;
    const measure = () => setBody({ width: bodyEl.clientWidth, height: bodyEl.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(bodyEl);
    return () => observer.disconnect();
  }, [bodyEl]);

  const setMode = useCallback((next: LayoutMode) => {
    setModeState(next);
    store(MODE_KEY, next === "auto" ? null : next);
  }, []);

  /** Cycle the inspector position: Auto → Side → Bottom → Auto. */
  const cycleMode = useCallback(() => setMode(nextLayoutMode(mode)), [mode, setMode]);

  /** Set the dock height; null returns to the automatic one. */
  const setDockHeight = useCallback((next: number | null) => {
    setDockState(next);
    store(DOCK_KEY, next === null ? null : String(Math.round(next)));
  }, []);

  const setCollapsed = useCallback((next: boolean) => {
    setCollapsedState(next);
    store(COLLAPSED_KEY, next ? "1" : null);
  }, []);
  const toggleCollapsed = useCallback(() => setCollapsed(!collapsed), [setCollapsed, collapsed]);

  const { width: pageW, height: pageH, naturalHeight } = page;
  const { width: designW, height: designH } = design;
  const leftOverlay = !leftPanelFits(body.width, placementFor(mode, design, forceSide), {
    rail,
    drawer,
    // A collapsed side inspector leaves its column to the canvas.
    inspector: collapsed ? 0 : INSPECTOR_WIDTH,
  });
  const layouts = useMemo(() => {
    const input = {
      body,
      page: { width: pageW, height: pageH, naturalHeight },
      rail,
      // An overlaid left panel takes no width from the canvas.
      drawer: leftOverlay ? 0 : drawer,
      design: { width: designW, height: designH },
      inspector: INSPECTOR_WIDTH,
      mode: forceSide ? ("side" as const) : mode,
    };
    return {
      layout: computeLayout({ ...input, dockHeight: dock, collapsed }),
      auto: computeLayout(input),
    };
  }, [body, pageW, pageH, naturalHeight, designW, designH, rail, drawer, leftOverlay, forceSide, mode, dock, collapsed]);

  const layout: StudioLayout = layouts.layout;
  return {
    bodyRef: setBodyEl,
    body,
    layout,
    /** The left panel does not fit beside the canvas: the shell lays it over the canvas. */
    leftOverlay,
    /** The dock height without the user's override (the splitter snaps to it). */
    autoDockHeight: layouts.auto.dockHeight,
    mode,
    setMode,
    cycleMode,
    setDockHeight,
    /** The inspector is collapsed: the dock shows only its bar (bottom), the side column is hidden. */
    collapsed,
    setCollapsed,
    toggleCollapsed,
  };
}
