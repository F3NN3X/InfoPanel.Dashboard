import { DEFAULT_THEME, type ThemeTokens } from "./theme";
import type { ModuleSettings } from "@/modules/types";

/**
 * Layout engine — the dashboard is a grid of *placements*. Each placement
 * hosts one registered module (or the "cards" catch-all grid) and spans a
 * number of grid columns. Layouts are organised per *monitor profile*, so
 * one dashboard can be shaped for a 1920×550 kiosk strip, a 1024×600 panel,
 * a 1080p display, ... and the right profile is picked automatically by
 * window size (or pinned to one).
 */

export const CARDS_ID = "cards";
/** Sentinel module id for placement instances that render a custom panel. */
export const PANEL_ID = "panel";

/* ---------------------------------------------------------------- *
 * Panels + widgets — the "layers and groups" model.
 *
 * Mirrors the host InfoPanel display-item tree: a *panel* (group) is a
 * placed block holding an ordered list of *widgets* (atomic items: a
 * stat readout, a bar, a gauge, a sparkline, a table, an image, a
 * clock, …). Every widget is independently bindable to a live sensor,
 * toggleable, reorderable, and restylable — which is what lets a
 * dashboard be assembled from arbitrary pieces.
 * ---------------------------------------------------------------- */

export type WidgetKind =
  | "stat" // label + big number tile
  | "value" // compact inline readout
  | "bar" // label + value + horizontal fill
  | "gauge" // circular ring
  | "sparkline" // rolling mini line graph
  | "table" // rows from a multi-line text sensor
  | "text" // static or bound text
  | "image" // image (game cover, logo, album art, …)
  | "clock"; // live time / date

export interface Widget {
  id: string;
  kind: WidgetKind;
  /** Shown above/beside the value. */
  label?: string;
  /** Full sensor key this widget reads (set via the sensor picker). */
  sensor?: string;
  /** Static text for "text"; static image URL for "image". */
  text?: string;
  unit?: string;
  /** Decimals to render a numeric value with (0 = integer). */
  decimals?: number;
  /** Hex color override for this widget's accents. */
  color?: string;
  /** Bar/gauge denominator (percent = value / max). */
  max?: number;
  /** Invert the fill (e.g. frame time: higher = worse = less fill). */
  inverted?: boolean;
  /** Max rows for "table". */
  rows?: number;
  /** "clock" layout. */
  clock?: "time" | "date" | "both";
  /** Sparkline sample count. */
  history?: number;
  visible: boolean;
}

/** A custom panel (group) — a placed block of widgets. */
export interface PanelDef {
  id: string;
  title: string;
  titleVisible: boolean;
  visible: boolean;
  accent?: string;
  background: "none" | "panel" | "bordered";
  widgets: Widget[];
}

/** Per-instance visual overrides for a placement. */
export interface PlacementDesign {
  /** Hex color overriding the theme accent for this placement only. */
  accent?: string;
  /** Background treatment around the module content. */
  background?: "none" | "panel" | "bordered";
  /** Render a small uppercase title header above the content. */
  header?: boolean;
}

export interface Placement {
  /** Unique instance id (React key). */
  id: string;
  /** Registry module id, CARDS_ID, or PANEL_ID (custom panel). */
  module: string;
  /** Number of grid columns this placement spans. */
  colSpan: number;
  visible: boolean;
  /** Per-instance module settings, merged over the module's defaults. */
  settings?: ModuleSettings;
  /** Per-instance design overrides (accent, background, header). */
  design?: PlacementDesign;
  /** Present when this placement renders a custom panel (group). */
  panel?: PanelDef;
}

export interface MonitorProfile {
  id: string;
  name: string;
  /** Design window width in px (used for auto-selection). */
  width: number;
  /** Design window height in px. */
  height: number;
  /** Number of grid columns. */
  cols: number;
  /**
   * "scroll": content flows and the page scrolls (normal displays).
   * "fill": content is squeezed into the viewport height (kiosk strips).
   */
  fit: "scroll" | "fill";
  placements: Placement[];
}

export interface DashboardConfig {
  version: 1;
  /** Profile id to show, or "auto" to match the window size. */
  activeProfile: string;
  profiles: MonitorProfile[];
  theme: ThemeTokens;
  /** Corner radius in rem (shadcn --radius). */
  radius: number;
}

const STORAGE_KEY = "infopanel-dashboard:config:v1";

let counter = 0;
export function uid(prefix = "p"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function placement(
  module: string,
  colSpan: number,
  visible = true
): Placement {
  return { id: uid(module), module, colSpan, visible };
}

function defaultProfiles(): MonitorProfile[] {
  return [
    {
      id: "main",
      name: "Main display",
      width: 1920,
      height: 1080,
      cols: 12,
      fit: "scroll",
      placements: [
        placement("system", 12),
        placement("spotify", 6),
        placement("media", 6),
        placement("steam", 12),
        placement("weather", 12),
        placement("fps", 12),
        placement("audio", 6),
        placement("vbz", 6),
        placement("bluetooth", 6),
        placement("notifications", 6),
        placement("textfile", 6),
        placement("streamdeck", 12),
        placement(CARDS_ID, 12),
      ],
    },
    {
      id: "strip-1920x550",
      name: "Kiosk strip 1920×550",
      width: 1920,
      height: 550,
      cols: 12,
      fit: "fill",
      placements: [
        placement("system", 2),
        placement("spotify", 2),
        placement("media", 2),
        placement("steam", 2),
        placement("weather", 2),
        placement("fps", 2),
      ],
    },
    {
      id: "small-1024x600",
      name: "Small 1024×600",
      width: 1024,
      height: 600,
      cols: 6,
      fit: "scroll",
      placements: [
        placement("system", 2),
        placement("spotify", 2),
        placement("weather", 2),
        placement("media", 3),
        placement("steam", 3),
        placement("fps", 3),
        placement("audio", 3),
        placement(CARDS_ID, 6),
      ],
    },
  ];
}

export function defaultConfig(): DashboardConfig {
  return {
    version: 1,
    activeProfile: "auto",
    profiles: defaultProfiles(),
    theme: { ...DEFAULT_THEME },
    radius: 0.5,
  };
}

/** Load the saved config, merged over defaults (tolerates missing fields). */
export function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    const parsed = JSON.parse(raw) as Partial<DashboardConfig>;
    const defaults = defaultConfig();
    return {
      version: 1,
      activeProfile: parsed.activeProfile ?? defaults.activeProfile,
      profiles:
        parsed.profiles && parsed.profiles.length > 0
          ? parsed.profiles
          : defaults.profiles,
      theme: { ...DEFAULT_THEME, ...parsed.theme },
      radius: parsed.radius ?? defaults.radius,
    };
  } catch {
    return defaultConfig();
  }
}

export function saveConfig(config: DashboardConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Storage unavailable (private mode) — the session just won't persist.
  }
}

/**
 * Which profile to show: the pinned one, or the one whose design size is
 * closest to the current window (width dominates, height breaks ties).
 */
export function resolveProfile(
  config: DashboardConfig,
  windowWidth: number,
  windowHeight: number
): MonitorProfile {
  if (config.activeProfile !== "auto") {
    const pinned = config.profiles.find((p) => p.id === config.activeProfile);
    if (pinned) return pinned;
  }
  let best: MonitorProfile | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const profile of config.profiles) {
    const score =
      Math.abs(profile.width - windowWidth) +
      Math.abs(profile.height - windowHeight) / 4;
    if (score < bestScore) {
      bestScore = score;
      best = profile;
    }
  }
  return best ?? config.profiles[0] ?? defaultConfig().profiles[0];
}

/** A new, empty profile for the given window size. */
export function newProfile(
  name: string,
  width: number,
  height: number
): MonitorProfile {
  return {
    id: uid("profile"),
    name,
    width,
    height,
    cols: width <= 1280 ? 6 : 12,
    fit: height <= 700 && width >= 1600 ? "fill" : "scroll",
    placements: [
      placement("system", width <= 1280 ? 6 : 12),
      placement("spotify", width <= 1280 ? 3 : 6),
      placement("media", width <= 1280 ? 3 : 6),
      placement("weather", width <= 1280 ? 6 : 12),
      placement(CARDS_ID, width <= 1280 ? 6 : 12),
    ],
  };
}

export function clonePlacement(p: Placement): Placement {
  return {
    ...p,
    id: uid(p.module),
    settings: p.settings ? { ...p.settings } : undefined,
    design: p.design ? { ...p.design } : undefined,
    panel: p.panel ? clonePanel(p.panel) : undefined,
  };
}

/** A fresh, empty widget of a kind (ids are unique). */
export function newWidget(kind: WidgetKind): Widget {
  return { id: uid("w"), kind, visible: true };
}

/** Deep-clone a panel with fresh ids (widgets keep their fields). */
export function clonePanel(p: PanelDef): PanelDef {
  return {
    ...p,
    id: uid("panel"),
    widgets: p.widgets.map((w) => ({ ...w, id: uid("w") })),
  };
}

/** A fresh, empty panel. */
export function newPanel(title: string): PanelDef {
  return {
    id: uid("panel"),
    title,
    titleVisible: true,
    visible: true,
    background: "panel",
    widgets: [],
  };
}
