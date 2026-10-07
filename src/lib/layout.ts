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
  | "clock" // live time / date
  | "shape"; // decorative vbar / hbar / rect / circle

/** Decorative shape kinds (the "simple shapes" you can drop into a panel). */
export type ShapeType = "vbar" | "hbar" | "rect" | "circle";

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
  /**
   * Font size in px for the value/text (ring diameter for "gauge").
   * The label scales with it.
   */
  fontSize?: number;
  /** Text alignment for "text", "table" and "clock". */
  align?: "left" | "center" | "right";
  /** Grid layout: number of panel columns this widget spans. */
  span?: number;
  /** Grid layout: number of panel rows this widget spans. */
  rowSpan?: number;
  /** Shape kind for "shape". */
  shape?: ShapeType;
  /** Thickness (bars) / diameter (circle), in px. */
  thickness?: number;
  /** Second bound sensor, rendered small below the value (value/stat). */
  subSensor?: string;
  /** "table": split each line into N comma-separated columns. */
  columns?: number;
  /** "table": static comma-separated header row. */
  header?: string;
  /** "image": max height in px (capped by the widget's cell). */
  height?: number;
  /** "overlay" panel layout: render this image widget as the panel's background. */
  asBackground?: boolean;
  /** "overlay" panel layout: which zone of the background this widget sits in. */
  overlayZone?: "top" | "middle" | "bottom";
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
  /**
   * "wrap" flows widgets inline (default); "grid" arranges them in columns;
   * "overlay" paints an image widget across the panel and layers the rest
   * in top / middle / bottom zones on top of it.
   */
  layout?: "wrap" | "grid" | "overlay";
  /** Column count for "grid" layout. */
  columns?: number;
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
  /** 1-based grid row this placement starts in (auto when omitted). */
  rowStart?: number;
  /** Number of grid rows this placement spans (height). */
  rowSpan?: number;
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
  /**
   * Set on shipped (non-user) profiles; when the app ships an updated copy
   * of a profile with a higher version, the saved copy is replaced.
   */
  sampleVersion?: number;
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
    sampleProfile(),
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
    const profiles =
      parsed.profiles && parsed.profiles.length > 0
        ? parsed.profiles
        : defaults.profiles;
    // Re-inject the sample profile if a saved config is missing it, and
    // replace it when the app ships a newer version of the shipped layout.
    const existingSample = profiles.find((p) => p.id === SAMPLE_PROFILE_ID);
    if (!existingSample) {
      profiles.push(sampleProfile());
    } else if (existingSample.sampleVersion !== SAMPLE_PROFILE_VERSION) {
      profiles[profiles.indexOf(existingSample)] = sampleProfile();
    }
    return {
      version: 1,
      activeProfile: parsed.activeProfile ?? defaults.activeProfile,
      profiles,
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
  if (kind === "shape")
    return { id: uid("w"), kind, shape: "vbar", thickness: 4, visible: true };
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

/* ---------------------------------------------------------------- *
 * Sample profile — a from-scratch recreation of the reference
 * kiosk layout (FPS rings, big clock block, last-played-game panel,
 * weather, GPU/RAM readouts, network + steam news cards).
 *
 * It is a *profile*, not a preset: it ships as one of the default
 * profiles, and `loadConfig` re-injects it if a saved config is
 * missing it, so existing installs pick it up on the next load.
 * Every widget is bound to a real live sensor and stays editable.
 * ---------------------------------------------------------------- */

export const SAMPLE_PROFILE_ID = "sample-1920x1080";
/**
 * Bump whenever the shipped sample layout changes so saved copies in
 * localStorage (kiosk machines) are upgraded on the next load.
 */
export const SAMPLE_PROFILE_VERSION = 6;

/** The yellow accent the sample layout is built around. */
const SAMPLE_ACCENT = "#f5c518";

const RTSS = (n: string) => `plugins.InfoPanel.RTSS.rtss.${n}`;
const STEAM = (n: string) => `plugins.InfoPanel.SteamAPI.${n}`;
const NVIDIA = (n: string) => `libre.nvidia_geforce_rtx_5090_${n}`;
const WEATHER = (n: string) => `plugins.yr-weather-plugin.brevik-norway.${n}`;

/** Shorthand for building sample widgets with fresh ids. */
function sw(fields: Partial<Widget> & { kind: WidgetKind }): Widget {
  return { id: uid("w"), visible: true, ...fields };
}

/** An accent-yellow vertical bar (the sample's decorative dividers). */
function vbar(extra?: Partial<Widget>): Widget {
  return sw({
    kind: "shape",
    shape: "vbar",
    thickness: 8,
    color: SAMPLE_ACCENT,
    ...extra,
  });
}

/** Shorthand for building sample panels with fresh ids. */
function sp(
  fields: Partial<Omit<PanelDef, "widgets" | "title">> & {
    title: string;
    widgets: Widget[];
  }
): PanelDef {
  return {
    id: uid("panel"),
    titleVisible: false,
    visible: true,
    background: "none",
    ...fields,
  };
}

interface SamplePlacementOpts {
  rowStart?: number;
  rowSpan?: number;
}

function sampleModulePlacement(
  module: string,
  colSpan: number,
  opts: SamplePlacementOpts & {
    settings?: Placement["settings"];
    design?: Placement["design"];
  } = {}
): Placement {
  return {
    id: uid(module),
    module,
    colSpan,
    visible: true,
    rowStart: opts.rowStart,
    rowSpan: opts.rowSpan,
    settings: opts.settings,
    design: opts.design,
  };
}

function samplePanelPlacement(
  panel: PanelDef,
  colSpan: number,
  opts: SamplePlacementOpts = {}
): Placement {
  return {
    id: uid(PANEL_ID),
    module: PANEL_ID,
    colSpan,
    visible: true,
    rowStart: opts.rowStart,
    rowSpan: opts.rowSpan,
    panel,
  };
}

/**
 * Macro layout of the sample (12 cols × 6 equal rows, "fill"):
 *
 *   row 1  spotify (3)   │ clock block (5, rows 1–3) │ last played (4, rows 1–3)
 *   row 2  fps rings (3) │                            │
 *   row 3  network (3)   │                            │
 *   rows 4–6 weather (4) │ gpu (4)                    │ session (4)
 */
export function sampleProfile(): MonitorProfile {
  // — Left column, row 2: FPS rings — six small gauges in a single row.
  const fpsRings = sp({
    title: "FPS rings",
    accent: SAMPLE_ACCENT,
    layout: "grid",
    columns: 6,
    widgets: [
      sw({ kind: "gauge", sensor: RTSS("fps"), max: 240, fontSize: 36 }),
      sw({ kind: "gauge", sensor: RTSS("avg-fps"), max: 240, fontSize: 36 }),
      sw({ kind: "gauge", sensor: RTSS("1% low fps"), max: 240, fontSize: 36 }),
      sw({ kind: "gauge", sensor: RTSS("refreshrate"), max: 240, fontSize: 36 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_core"), max: 100, fontSize: 36 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_memory_junction"), max: 100, fontSize: 36 }),
    ],
  });

  // — Center block (rows 1–3): dividers, "capturing" line, the big FPS
  //   readout (frame time stacked below) with GPU stat tiles, and the clock.
  const clockBlock = sp({
    title: "Clock block",
    accent: SAMPLE_ACCENT,
    layout: "grid",
    columns: 6,
    widgets: [
      vbar({ rowSpan: 4 }),
      sw({ kind: "text", label: "Capturing", text: "No games to capture", span: 4, fontSize: 16 }),
      vbar(),
      sw({ kind: "value", sensor: RTSS("fps"), subSensor: RTSS("current frame time"), fontSize: 40 }),
      sw({ kind: "stat", label: "Power W", sensor: NVIDIA("gpu_board_power"), fontSize: 20 }),
      sw({ kind: "stat", label: "Mem °", sensor: NVIDIA("gpu_memory_junction"), fontSize: 20 }),
      sw({ kind: "stat", label: "Core °", sensor: NVIDIA("gpu_core"), fontSize: 20 }),
      sw({ kind: "stat", label: "Load", sensor: NVIDIA("d3d_3d"), unit: "%", fontSize: 20 }),
      sw({ kind: "clock", span: 5, rowSpan: 2, fontSize: 84, color: SAMPLE_ACCENT }),
    ],
  });

  // — Right block (rows 1–3): last played game — the banner is the panel's
  //   background with the game icon, name, session timer, start time,
  //   total hours and the friends table layered on top.
  const lastPlayed = sp({
    title: "Last played game",
    accent: SAMPLE_ACCENT,
    background: "panel",
    titleVisible: true,
    layout: "overlay",
    widgets: [
      sw({ kind: "image", sensor: STEAM("SteamAPI-Profile.current_game_banner_url"), asBackground: true }),
      sw({ kind: "image", sensor: STEAM("SteamAPI-Profile.game_icon_url"), height: 44, overlayZone: "top" }),
      sw({ kind: "text", sensor: STEAM("SteamAPI-Session.current-game"), fontSize: 22, overlayZone: "top" }),
      sw({ kind: "value", sensor: STEAM("SteamAPI-Session.current-session-time"), color: SAMPLE_ACCENT, fontSize: 40, overlayZone: "middle" }),
      sw({ kind: "text", label: "Started", sensor: STEAM("SteamAPI-Session.session-start-time"), overlayZone: "bottom" }),
      sw({ kind: "value", label: "Total hours", sensor: STEAM("SteamAPI-Library.recent-playtime"), overlayZone: "bottom" }),
      sw({ kind: "table", label: "Friends", sensor: STEAM("SteamAPI-Social.friends-activity"), rows: 3, columns: 4, header: "Friend, Status, Playing, Last Online", overlayZone: "bottom" }),
    ],
  });

  // — Left column, row 3: network upload/download cards.
  const network = sp({
    title: "Network",
    background: "panel",
    layout: "grid",
    columns: 2,
    widgets: [
      sw({ kind: "stat", label: "Data Upload", sensor: "libre.ethernet_data_uploaded", color: SAMPLE_ACCENT }),
      sw({ kind: "stat", label: "Data Download", sensor: "libre.ethernet_data_downloaded", color: SAMPLE_ACCENT }),
    ],
  });

  // — Bottom row, left: current conditions + 7-day forecast table.
  // The forecast lines come from the DataBridge's own MET Norway fetch
  // (the yr plugin only pushes a single day).
  const weather = sp({
    title: "Weather",
    background: "panel",
    layout: "grid",
    columns: 4,
    widgets: [
      sw({ kind: "text", text: "Current surface data", span: 4, fontSize: 11, color: "#94a3b8" }),
      sw({ kind: "value", sensor: WEATHER("weather_desc"), fontSize: 16 }),
      sw({ kind: "stat", sensor: WEATHER("temp"), span: 2, color: SAMPLE_ACCENT, fontSize: 24 }),
      sw({ kind: "value", sensor: WEATHER("wind_speed"), label: "m/s", decimals: 1 }),
      sw({ kind: "table", sensor: "plugins.InfoPanel.DataBridge.weather.forecast", rows: 7, span: 4, columns: 5, header: "Date, Weather, Temp, Precip, Wind" }),
    ],
  });

  // — Bottom row, center: GPU sparkline + RAM bars + 2×2 stats,
  //   bracketed by full-height bars.
  const gpuBlock = sp({
    title: "GPU / RAM",
    accent: SAMPLE_ACCENT,
    layout: "grid",
    columns: 7,
    widgets: [
      vbar({ rowSpan: 3 }),
      sw({ kind: "sparkline", label: "GPU power (W)", sensor: NVIDIA("gpu_board_power"), history: 80, span: 5, color: SAMPLE_ACCENT }),
      vbar({ rowSpan: 3 }),
      sw({ kind: "bar", label: "RAM USED", sensor: "libre.total_memory_memory_used", max: 64, span: 3 }),
      sw({ kind: "stat", label: "Load", sensor: NVIDIA("d3d_3d"), unit: "%", fontSize: 18 }),
      sw({ kind: "stat", label: "Power W", sensor: NVIDIA("gpu_board_power"), fontSize: 18 }),
      sw({ kind: "bar", label: "RAM FREE", sensor: "libre.total_memory_memory_available", max: 64, span: 3 }),
      sw({ kind: "stat", label: "Mem °", sensor: NVIDIA("gpu_memory_junction"), fontSize: 18 }),
      sw({ kind: "stat", label: "Core °", sensor: NVIDIA("gpu_core"), fontSize: 18 }),
    ],
  });

  // — Bottom row, right: session summary — game, most played, news, dates.
  const sessionBlock = sp({
    title: "Session",
    background: "panel",
    layout: "grid",
    columns: 3,
    widgets: [
      sw({ kind: "text", label: "Game", sensor: STEAM("SteamAPI-Session.current-game") }),
      sw({ kind: "text", label: "News", sensor: STEAM("SteamAPI-News.library-news"), rowSpan: 2 }),
      sw({ kind: "text", label: "Date", text: "Oct 07\nOct 06", align: "right", rowSpan: 2 }),
      sw({ kind: "text", sensor: STEAM("SteamAPI-Library.most-played-recent") }),
    ],
  });

  return {
    id: SAMPLE_PROFILE_ID,
    name: "Sample 1920×1080",
    sampleVersion: SAMPLE_PROFILE_VERSION,
    width: 1920,
    height: 1080,
    cols: 12,
    fit: "fill",
    placements: [
      sampleModulePlacement("spotify", 3, {
        rowStart: 1,
        settings: { bar: true },
        design: { accent: SAMPLE_ACCENT },
      }),
      samplePanelPlacement(fpsRings, 3, { rowStart: 2 }),
      samplePanelPlacement(network, 3, { rowStart: 3 }),
      samplePanelPlacement(clockBlock, 5, { rowStart: 1, rowSpan: 3 }),
      samplePanelPlacement(lastPlayed, 4, { rowStart: 1, rowSpan: 3 }),
      samplePanelPlacement(weather, 4, { rowStart: 4, rowSpan: 3 }),
      samplePanelPlacement(gpuBlock, 4, { rowStart: 4, rowSpan: 3 }),
      samplePanelPlacement(sessionBlock, 4, { rowStart: 4, rowSpan: 3 }),
    ],
  };
}
