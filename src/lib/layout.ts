import { DEFAULT_THEME, normalizeThemePatch, type ThemeTokens } from "./theme";
import { normalizeBackground, type PageBackground } from "./appearance";
import { normalizeAppearancePresets, type AppearancePreset } from "./appearance-presets";
import type { ModuleSettings } from "@/modules/types";
import type { StyleMode } from "./style-resolve";
import { normalizeApiBase } from "./data-api";
import { normalizeGeneral, type GeneralSettings } from "./general";
import { normalizeSpacing } from "./profile-grid";
import { YR_FORECAST_KEY } from "./sensors";
import { mainPage, normalizeRotate } from "./pages";
import {
  normalizePanelPlacement,
  normalizePanelPresets,
  type PanelDef,
  type UserPanelPreset,
  type Widget,
  type WidgetKind,
} from "./panel-model";

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
/** Sentinel module id for a zone with no widget (a drawn, unfilled region). */
export const BLANK_MODULE = "blank";
/** Fixed row height (design px) for "scroll" profiles — the page scrolls. */
export const SCROLL_ROW_H = 120;

// Panels + widgets: the model (types, normalization) lives in panel-model.ts.
export type {
  BoxAlign,
  BoxSize,
  OverlayBand,
  PanelDef,
  PanelJustify,
  PanelLayout,
  ShapeType,
  UserPanelPreset,
  Widget,
  WidgetBox,
  WidgetKind,
} from "./panel-model";

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
  /**
   * Registry module id, CARDS_ID, BLANK_MODULE, or PANEL_ID (custom panel)
   * — the widget the zone hosts.
   */
  module: string;
  /** 1-based grid column this zone starts in. */
  colStart: number;
  /** 1-based grid row this zone starts in. */
  rowStart: number;
  /** Number of grid columns this zone spans (width). */
  colSpan: number;
  /** Number of grid rows this zone spans (height). */
  rowSpan: number;
  visible: boolean;
  /** Per-instance module settings, merged over the module's defaults. */
  settings?: ModuleSettings;
  /** Per-instance design overrides (accent, background, header). */
  design?: PlacementDesign;
  /** Present when this placement renders a custom panel (group). */
  panel?: PanelDef;
  /**
   * "follow": the dashboard / profile style only — the widget's own look
   * values stay stored but are ignored; "custom": its own look wins.
   * Unset: its own values win key by key (as "custom").
   */
  styleMode?: StyleMode;
}

export interface ProfilePage {
  id: string;
  name: string;
  /** lucide icon name (page switcher, Stream Deck keys); unset = none. */
  icon?: string;
  placements: Placement[];
}

/** Auto-rotate through pages; `enabled: false` keeps the interval and list stored. */
export interface PageRotate {
  enabled: boolean;
  seconds: number;
  /** Page ids to rotate through; unset/empty = every page. */
  pages?: string[];
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
   * Number of grid rows — uniform cells of width/cols × height/rows.
   * Zones are drawn, moved and resized on this grid (no auto-flow).
   */
  rows: number;
  /**
   * "scroll": fixed row height (SCROLL_ROW_H) and the page scrolls
   * (normal displays). "fill": the grid fills the profile height exactly
   * (kiosk strips).
   */
  fit: "scroll" | "fill";
  /** The profile's pages (at least one); each has its own zones. */
  pages: ProfilePage[];
  /** Auto-rotate through the pages; unset = off. */
  rotate?: PageRotate;
  /**
   * Style defaults for every widget in the profile (the look-only keys of
   * the standard settings, see `PROFILE_STYLE_KEYS`). A widget's own
   * value overrides them (see `resolveStyle`).
   */
  style?: ModuleSettings;
  /**
   * Force the global style on every widget of this profile (own looks
   * ignored); unset = the dashboard's choice.
   */
  styleEnforce?: boolean;
  /**
   * This profile's page background, replacing the dashboard's
   * (`{ type: "none" }`: none for this profile; unset: the dashboard's).
   */
  background?: PageBackground;
  /**
   * This profile's theme colours over the dashboard's (`resolveTheme`);
   * unset = the dashboard's theme.
   */
  theme?: Partial<ThemeTokens>;
  /** This profile's corner radius in rem; unset = the dashboard's. */
  radius?: number;
  /** Space between zones in px (unset = `DEFAULT_GRID_GAP`, see profile-grid.ts). */
  gap?: number;
  /** Space around the grid in px (unset = the page's default per mode, see `profilePadding`). */
  padding?: number;
  /**
   * Set on shipped (non-user) profiles; when the app ships an updated copy
   * of a profile with a higher version, the saved copy is replaced.
   */
  sampleVersion?: number;
}

/**
 * One page of a profile as the studio and kiosk edit and draw it: the
 * profile's fields plus that page's zones.
 */
export type ProfileView = Omit<MonitorProfile, "pages"> & {
  placements: Placement[];
  pageId?: string;
};

export interface DashboardConfig {
  version: 3;
  /** Profile id to show, or "auto" to match the window size. */
  activeProfile: string;
  /**
   * Dashboard-side source preferences (which sources show and how they're
   * labelled). Keys are `{plugin}::{container}` (container "" for flat
   * sources). Pure display config — the host's own plugin settings are
   * untouched.
   */
  sourcePrefs?: Record<string, SourcePref>;
  profiles: MonitorProfile[];
  theme: ThemeTokens;
  /** Corner radius in rem (shadcn --radius). */
  radius: number;
  /** Base URL of InfoPanel's Data API (default http://127.0.0.1:3921). */
  dataApiUrl?: string;
  /** Saved widget styles, applied from the studio inspector. */
  stylePresets?: StylePreset[];
  /** Panels the user saved for reuse (Add / widget picker). */
  panelPresets?: UserPanelPreset[];
  /** Page background behind every profile's grid (see appearance.ts). */
  background?: PageBackground;
  /**
   * Style defaults for every widget in every profile (the look keys); a
   * profile's `style` and a widget's own values override them.
   */
  style?: ModuleSettings;
  /** Force the global style on every widget (a profile can override it). */
  styleEnforce?: boolean;
  /** Whole looks the user saved (Appearance gallery; see appearance-presets.ts). */
  appearancePresets?: AppearancePreset[];
  /** Font, clock format, locale, motion and kiosk cursor (see general.ts). */
  general?: GeneralSettings;
}

/** A named set of style values (the keys in `PROFILE_STYLE_KEYS`). */
export interface StylePreset {
  id: string;
  name: string;
  settings: ModuleSettings;
}

/** Dashboard-side configuration for one source (container). */
export interface SourcePref {
  /** Show this source in the dashboard (default: true). */
  enabled?: boolean;
  /** Display-name override for this source. */
  displayName?: string;
}

/** Composite key for a source preference: `{plugin}::{container}`. */
export function sourcePrefKey(plugin: string, container: string): string {
  return `${plugin}::${container}`;
}

const STORAGE_KEY = "infopanel-dashboard:config:v1";

let counter = 0;
export function uid(prefix = "p"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

function placement(
  module: string,
  colStart: number,
  rowStart: number,
  colSpan: number,
  rowSpan = 1
): Placement {
  return {
    id: uid(module),
    module,
    colStart,
    rowStart,
    colSpan,
    rowSpan,
    visible: true,
  };
}

function defaultProfiles(): MonitorProfile[] {
  return [
    sampleProfile(),
    arcv2Profile(),
    {
      id: "main",
      name: "Main display",
      width: 1920,
      height: 1080,
      cols: 12,
      rows: 10,
      fit: "scroll",
      pages: [mainPage([
        placement("systemmodern", 1, 1, 12),
        placement("spotifymodern", 1, 2, 6),
        placement("mediamodern", 7, 2, 6),
        placement("steammodern", 1, 3, 12),
        placement("weathermodern", 1, 4, 12),
        placement("fpsmodern", 1, 5, 12),
        placement("audiomodern", 1, 6, 6),
        placement("vbz", 7, 6, 6),
        placement("bluetoothmodern", 1, 7, 6),
        placement("notifications", 7, 7, 6),
        placement("textfile", 1, 8, 6),
        placement("streamdeck", 1, 9, 12),
        placement(CARDS_ID, 1, 10, 12),
      ])],
    },
    {
      id: "strip-1920x550",
      name: "Kiosk strip 1920×550",
      width: 1920,
      height: 550,
      cols: 12,
      rows: 2,
      fit: "fill",
      pages: [mainPage([
        placement("systemmodern", 1, 1, 2, 2),
        placement("spotifymodern", 3, 1, 2, 2),
        placement("mediamodern", 5, 1, 2, 2),
        placement("steammodern", 7, 1, 2, 2),
        placement("weathermodern", 9, 1, 2, 2),
        placement("fpsmodern", 11, 1, 2, 2),
      ])],
    },
    {
      id: "small-1024x600",
      name: "Small 1024×600",
      width: 1024,
      height: 600,
      cols: 6,
      rows: 4,
      fit: "scroll",
      pages: [mainPage([
        placement("systemmodern", 1, 1, 2),
        placement("spotifymodern", 3, 1, 2),
        placement("weathermodern", 5, 1, 2),
        placement("mediamodern", 1, 2, 3),
        placement("steammodern", 4, 2, 3),
        placement("fpsmodern", 1, 3, 3),
        placement("audiomodern", 4, 3, 3),
        placement(CARDS_ID, 1, 4, 6),
      ])],
    },
  ];
}

export function defaultConfig(): DashboardConfig {
  return {
    version: 3,
    activeProfile: "auto",
    profiles: defaultProfiles(),
    theme: { ...DEFAULT_THEME },
    radius: 0.5,
  };
}

/** A profile as stored: v3 (`pages`) or legacy (`placements`). */
export type StoredProfile = Partial<Pick<MonitorProfile, "pages">> &
  Omit<MonitorProfile, "pages"> & { placements?: Placement[] };

/**
 * v1→v2 profile normalization: legacy profiles auto-flowed their
 * placements (no colStart/rowStart) and had no rows. Simulate the old
 * left-to-right flow to fill explicit zone boxes in place, add a row
 * count, and clamp everything into the grid. Shipped profiles (already
 * explicit) pass through untouched.
 */
function normalizePlacements(
  list: Placement[],
  cols: number,
  rows: number
): Placement[] {
  const placements = list.map((pl) => ({
    ...normalizePanelPlacement(pl),
    colSpan: Math.max(1, Math.min(cols, pl.colSpan ?? 1)),
  }));
  if (placements.every((pl) => pl.colStart !== undefined && pl.rowStart !== undefined)) {
    // Explicit — just make sure rowSpan is set and boxes fit the grid.
    for (const pl of placements) {
      pl.rowSpan = Math.max(1, pl.rowSpan ?? 1);
      pl.rowStart = Math.max(1, Math.min(rows, pl.rowStart));
      pl.colStart = Math.max(1, Math.min(cols, pl.colStart));
      pl.rowSpan = Math.min(pl.rowSpan, rows - pl.rowStart + 1);
      pl.colSpan = Math.min(pl.colSpan, cols - pl.colStart + 1);
    }
    return placements;
  }
  // Auto-flow: explicit rowStarts pin their row; auto items advance a
  // left-to-right flow pointer that wraps at the grid edge.
  let flowRow = 1;
  let flowCol = 1;
  for (const pl of placements) {
    if (pl.colStart === undefined || pl.rowStart === undefined) {
      if (pl.rowStart !== undefined && pl.colStart === undefined) {
        flowRow = pl.rowStart;
        flowCol = 1;
      }
      if (flowCol + pl.colSpan - 1 > cols) {
        flowRow += 1;
        flowCol = 1;
      }
      pl.colStart = flowCol;
      pl.rowStart = pl.rowStart ?? flowRow;
      flowCol += pl.colSpan;
    }
    pl.rowSpan = Math.max(1, pl.rowSpan ?? 1);
  }
  for (const pl of placements) {
    pl.rowStart = Math.max(1, Math.min(rows, pl.rowStart));
    pl.colStart = Math.max(1, Math.min(cols, pl.colStart));
    pl.rowSpan = Math.min(pl.rowSpan, rows - pl.rowStart + 1);
    pl.colSpan = Math.min(pl.colSpan, cols - pl.colStart + 1);
  }
  return placements;
}

/**
 * v2→v3: a profile's `placements` become its first page; stored pages get
 * unique ids and names. The output never carries a `placements` key.
 */
function normalizePages(p: StoredProfile, cols: number, rows: number): ProfilePage[] {
  if (!Array.isArray(p.pages) || p.pages.length === 0)
    return [mainPage(normalizePlacements(p.placements ?? [], cols, rows))];
  const seen = new Set<string>();
  return p.pages.map((page, i) => {
    const id =
      typeof page.id === "string" && page.id && !seen.has(page.id) ? page.id : uid("page");
    seen.add(id);
    return {
      ...page,
      id,
      name: typeof page.name === "string" && page.name ? page.name : `Page ${i + 1}`,
      placements: normalizePlacements(page.placements ?? [], cols, rows),
    };
  });
}

function normalizeProfile(input: StoredProfile): MonitorProfile {
  const { placements: _legacy, ...p } = input;
  const cols = Math.max(2, p.cols ?? 12);
  const rows = Math.max(1, p.rows ?? (p.height <= 700 ? 4 : 6));
  const pages = normalizePages(input, cols, rows);
  return {
    ...p,
    cols,
    rows,
    pages,
    rotate: normalizeRotate(p.rotate, pages.map((pg) => pg.id)),
    ...profileExtras(p),
  };
}

/** A profile's appearance fields, guarded (bad values dropped). */
function profileExtras(p: StoredProfile): Partial<MonitorProfile> {
  return {
    background: normalizeBackground(p.background),
    theme: normalizeThemePatch(p.theme),
    radius: typeof p.radius === "number" && Number.isFinite(p.radius) ? p.radius : undefined,
    gap: normalizeSpacing(p.gap),
    padding: normalizeSpacing(p.padding),
  };
}

/**
 * Merge a stored/partial config over the defaults (tolerates missing
 * fields). Used by the local load and by the server-synced copy (the
 * kiosk pages pull the studio's latest state this way). Also runs the
 * v1→v2 migration: fills explicit zone boxes + rows on legacy profiles,
 * drops the retired free-canvas profiles, and repoints pins that
 * referenced them.
 */
/**
 * Image paths saved while the DataBridge plugin served the dashboard point
 * at http://127.0.0.1:3921/assets/<file>; those files now ship in the
 * build under /assets/ip/arcv2/ (see ASSET). Rewrites any saved copy.
 */
const LEGACY_ASSET_PREFIX = "http://127.0.0.1:3921/assets/";

/**
 * The DataBridge's open-meteo forecast is gone; bindings to it move to the
 * yr plugin's forecast, resolved at runtime (YR_FORECAST_KEY) because the
 * location slug differs per user.
 */
const LEGACY_FORECAST_KEYS = [
  "plugins.InfoPanel.DataBridge.weather.forecast",
  "plugins.data-bridge.weather.forecast",
];

/** A config as stored: any version, its profiles v3 or legacy. */
export type StoredConfig = Omit<Partial<DashboardConfig>, "version" | "profiles"> & {
  version?: number;
  profiles?: StoredProfile[];
};

function migrateAssetUrls(config: StoredConfig): StoredConfig {
  const json = JSON.stringify(config);
  const needsFix =
    json.includes(LEGACY_ASSET_PREFIX) ||
    LEGACY_FORECAST_KEYS.some((k) => json.includes(k));
  if (!needsFix) return config;
  let fixed = json.replaceAll(LEGACY_ASSET_PREFIX, ASSET(""));
  for (const key of LEGACY_FORECAST_KEYS)
    fixed = fixed.replaceAll(key, YR_FORECAST_KEY);
  return JSON.parse(fixed);
}

const isSettings = (v: unknown): v is ModuleSettings =>
  typeof v === "object" && v !== null && !Array.isArray(v);

export function mergeConfig(input: StoredConfig): DashboardConfig {
  const parsed = migrateAssetUrls(input);
  const defaults = defaultConfig();
  const profiles = (
    parsed.profiles && parsed.profiles.length > 0
      ? parsed.profiles
      : defaults.profiles
  ).map(normalizeProfile);
  // Re-inject the sample profile if a stored config is missing it, and
  // replace it when the app ships a newer version of the shipped layout.
  const existingSample = profiles.find((p) => p.id === SAMPLE_PROFILE_ID);
  if (!existingSample) {
    profiles.push(normalizeProfile(sampleProfile()));
  } else if (existingSample.sampleVersion !== SAMPLE_PROFILE_VERSION) {
    profiles[profiles.indexOf(existingSample)] = normalizeProfile(
      sampleProfile()
    );
  }
  // Same treatment for the shipped arcv2 recreation.
  const existingArc = profiles.find((p) => p.id === ARCV2_PROFILE_ID);
  if (!existingArc) {
    profiles.push(normalizeProfile(arcv2Profile()));
  } else if (existingArc.sampleVersion !== ARCV2_PROFILE_VERSION) {
    profiles[profiles.indexOf(existingArc)] = normalizeProfile(arcv2Profile());
  }
  // Pins pointing at dropped free-canvas profiles land on the grid
  // arcv2 (the 1:1 look is already covered by it).
  const byId = new Set(profiles.map((p) => p.id));
  let activeProfile = parsed.activeProfile ?? defaults.activeProfile;
  if (activeProfile !== "auto" && !byId.has(activeProfile))
    activeProfile = "auto";
  return {
    version: 3,
    activeProfile,
    sourcePrefs: parsed.sourcePrefs,
    profiles,
    theme: { ...DEFAULT_THEME, ...parsed.theme },
    radius: parsed.radius ?? defaults.radius,
    dataApiUrl: normalizeApiBase(parsed.dataApiUrl) ?? undefined,
    stylePresets: Array.isArray(parsed.stylePresets) ? parsed.stylePresets : undefined,
    panelPresets: normalizePanelPresets(parsed.panelPresets),
    background: normalizeBackground(parsed.background),
    style: isSettings(parsed.style) ? parsed.style : undefined,
    styleEnforce: typeof parsed.styleEnforce === "boolean" ? parsed.styleEnforce : undefined,
    appearancePresets: normalizeAppearancePresets(parsed.appearancePresets),
    general: normalizeGeneral(parsed.general),
  };
}

/** Load the saved config, merged over defaults (tolerates missing fields). */
export function loadConfig(): DashboardConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig();
    return mergeConfig(JSON.parse(raw) as StoredConfig);
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
    rows: height <= 700 ? 4 : 6,
    fit: height <= 700 && width >= 1600 ? "fill" : "scroll",
    // A blank canvas — the user draws zones, then fills them with widgets.
    pages: [mainPage()],
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
export const SAMPLE_PROFILE_VERSION = 7;

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
  colStart?: number;
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
    colStart: opts.colStart ?? 1,
    colSpan,
    visible: true,
    rowStart: opts.rowStart ?? 1,
    rowSpan: opts.rowSpan ?? 1,
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
    colStart: opts.colStart ?? 1,
    colSpan,
    visible: true,
    rowStart: opts.rowStart ?? 1,
    rowSpan: opts.rowSpan ?? 1,
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
  // — Left column, row 2: FPS rings — six gauges in a single row. A gauge's
  //   fontSize is its ring diameter: 56px fills the ~64px-tall strip row.
  const fpsRings = sp({
    title: "FPS rings",
    accent: SAMPLE_ACCENT,
    layout: "grid",
    columns: 6,
    widgets: [
      sw({ kind: "gauge", sensor: RTSS("fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("avg-fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("1% low fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("refreshrate"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_core"), max: 100, fontSize: 56 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_memory_junction"), max: 100, fontSize: 56 }),
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
      sw({ kind: "text", label: "Capturing", text: "No games to capture", span: 4, fontSize: 12 }),
      vbar(),
      sw({ kind: "value", sensor: RTSS("fps"), subSensor: RTSS("current frame time"), fontSize: 26 }),
      sw({ kind: "stat", label: "Power W", sensor: NVIDIA("gpu_board_power"), fontSize: 14 }),
      sw({ kind: "stat", label: "Mem °", sensor: NVIDIA("gpu_memory_junction"), fontSize: 14 }),
      sw({ kind: "stat", label: "Core °", sensor: NVIDIA("gpu_core"), fontSize: 14 }),
      sw({ kind: "stat", label: "Load", sensor: NVIDIA("d3d_3d"), unit: "%", fontSize: 14 }),
      sw({ kind: "clock", span: 5, rowSpan: 2, fontSize: 46, color: SAMPLE_ACCENT }),
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
      sw({ kind: "image", sensor: STEAM("SteamAPI-Profile.game_icon_url"), height: 30, overlayZone: "top" }),
      sw({ kind: "text", sensor: STEAM("SteamAPI-Session.current-game"), fontSize: 15, overlayZone: "top" }),
      sw({ kind: "value", sensor: STEAM("SteamAPI-Session.current-session-time"), color: SAMPLE_ACCENT, fontSize: 26, overlayZone: "middle" }),
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
  // The forecast lines come from the yr plugin's multi-day forecast.
  const weather = sp({
    title: "Weather",
    background: "panel",
    layout: "grid",
    columns: 4,
    widgets: [
      sw({ kind: "text", text: "Current surface data", span: 4, fontSize: 10, color: "#94a3b8" }),
      sw({ kind: "value", sensor: WEATHER("weather_desc"), fontSize: 13 }),
      sw({ kind: "stat", sensor: WEATHER("temp"), span: 2, color: SAMPLE_ACCENT, fontSize: 18 }),
      sw({ kind: "value", sensor: WEATHER("wind_speed"), label: "wind", decimals: 1 }),
      sw({ kind: "table", sensor: YR_FORECAST_KEY, rows: 7, span: 4, columns: 5, header: "Date, Weather, Temp, Precip, Wind" }),
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
      sw({ kind: "stat", label: "Load", sensor: NVIDIA("d3d_3d"), unit: "%", fontSize: 13 }),
      sw({ kind: "stat", label: "Power W", sensor: NVIDIA("gpu_board_power"), fontSize: 13 }),
      sw({ kind: "bar", label: "RAM FREE", sensor: "libre.total_memory_memory_available", max: 64, span: 3 }),
      sw({ kind: "stat", label: "Mem °", sensor: NVIDIA("gpu_memory_junction"), fontSize: 13 }),
      sw({ kind: "stat", label: "Core °", sensor: NVIDIA("gpu_core"), fontSize: 13 }),
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
    name: "Sample 1920×550",
    sampleVersion: SAMPLE_PROFILE_VERSION,
    width: 1920,
    height: 550,
    cols: 12,
    rows: 6,
    fit: "fill",
    pages: [mainPage([
      sampleModulePlacement("spotifymodern", 3, {
        colStart: 1,
        rowStart: 1,
        settings: { layout: "compact" },
        design: { accent: SAMPLE_ACCENT },
      }),
      samplePanelPlacement(fpsRings, 3, { colStart: 1, rowStart: 2 }),
      samplePanelPlacement(network, 3, { colStart: 1, rowStart: 3 }),
      samplePanelPlacement(clockBlock, 5, {
        colStart: 4,
        rowStart: 1,
        rowSpan: 3,
      }),
      samplePanelPlacement(lastPlayed, 4, {
        colStart: 9,
        rowStart: 1,
        rowSpan: 3,
      }),
      samplePanelPlacement(weather, 4, {
        colStart: 1,
        rowStart: 4,
        rowSpan: 3,
      }),
      samplePanelPlacement(gpuBlock, 4, {
        colStart: 5,
        rowStart: 4,
        rowSpan: 3,
      }),
      samplePanelPlacement(sessionBlock, 4, {
        colStart: 9,
        rowStart: 4,
        rowSpan: 3,
      }),
    ])],
  };
}

/* ---------------------------------------------------------------- *
 * arcv2 — a faithful recreation of the "ARCv2 WIDE" InfoPanel export
 * (1920×550) as a 3×3 grid of 4-wide panels:
 *
 *   Left   (C1–4)  : spotify (rows 1–2) · network (3–4) · weather (5–6)
 *   Center (C5–8)  : gpu readout (1–2) · big clock (3–4) · cpu strip (5–6)
 *   Right  (C9–12) : steam hero (1–2) · friends (3–4) · news (5–6)
 *
 * Colors, fonts, background art and sensor bindings come from the
 * export's Profile/DisplayItems.xml.
 *
 * Shipped like the sample profile: `loadConfig` re-injects it when a
 * saved config is missing it, and upgrades it when the version bumps.
 * ---------------------------------------------------------------- */

/** Shipped grid arcv2 recreation (the 1:1 InfoPanel look, grid model). */
export const ARCV2_PROFILE_ID = "arcv2";
export const ARCV2_PROFILE_VERSION = 5;

/** The export's yellow accent (#FFFFBC13 in Profile/DisplayItems.xml). */
const ARCV2_ACCENT = "#ffbc13";
/** Cream value text on the export's light panels. */
const ARCV2_DARK = "#3b3b3b";
/** Dark-navy text on the yellow SPOTIFY card. */
const ARCV2_NAVY = "#090d19";
/** Teal network bars from the export. */
const ARCV2_TEAL = "#3d94a8";
/** Warm off-white used for the export's secondary text. */
const ARCV2_CREAM = "#ebe6d7";
const ARCV2_FAINT = "#ffffffe0";

/**
 * RTSS / STEAM / NVIDIA / WEATHER (yr-weather) key helpers are shared with
 * the sample profile above; the extras live here.
 */
const AMD = (n: string) => `libre.amd_ryzen_9_9950x3d_${n}`;
const SPOTIFY = (n: string) => `plugins.spotify-plugin.spotify.${n}`;
/** InfoPanel export assets, shipped in public/assets/ip/arcv2/. */
const ASSET = (f: string) => `/assets/ip/arcv2/${f}`;

/** Shorthand for arcv2 panels (title hidden, no card background). */
function ap(
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

interface ArcPlacementOpts {
  colStart: number;
  rowStart: number;
  rowSpan?: number;
}

function apPlacement(panel: PanelDef, colSpan: number, opts: ArcPlacementOpts): Placement {
  return {
    id: uid(PANEL_ID),
    module: PANEL_ID,
    colSpan,
    colStart: opts.colStart,
    rowStart: opts.rowStart,
    rowSpan: opts.rowSpan ?? 1,
    visible: true,
    panel,
  };
}

export function arcv2Profile(): MonitorProfile {
  // — Right column, rows 1–2: the steam hero. Banner + dark scrim with
  //   status, session timer, start time and total hours (the export's
  //   "Current Game" title is hidden in the source, kept faithful).
  const steamTop = ap({
    title: "Steam hero",
    accent: ARCV2_ACCENT,
    layout: "overlay",
    widgets: [
      sw({ kind: "image", sensor: STEAM("SteamAPI-Profile.current_game_banner_url"), asBackground: true }),
      sw({ kind: "image", sensor: STEAM("SteamAPI-Profile.game_icon_url"), height: 30, overlayZone: "top" }),
      sw({ kind: "text", label: "Status", sensor: STEAM("SteamAPI-Profile.status"), fontSize: 13, color: ARCV2_FAINT, overlayZone: "top" }),
      sw({ kind: "text", sensor: STEAM("SteamAPI-Session.current-game"), fontSize: 24, color: ARCV2_FAINT, overlayZone: "top", visible: false }),
      sw({ kind: "value", sensor: STEAM("SteamAPI-Session.current-session-time"), label: "in game", fontSize: 20, color: "#ffffff", overlayZone: "middle" }),
      sw({ kind: "text", label: "Started", sensor: STEAM("SteamAPI-Session.session-start-time"), fontSize: 14, color: ARCV2_FAINT, overlayZone: "bottom" }),
      sw({ kind: "value", label: "hrs total", sensor: STEAM("SteamAPI-Library.recent-playtime"), fontSize: 14, color: ARCV2_FAINT, align: "right", overlayZone: "bottom" }),
    ],
  });

  // — Center column, rows 1–2: the GPU block. The export's cream GPU-bg
  //   panel (no scrim) with the big yellow FPS readout, 1% low + frame
  //   time, and the four stat columns the background art pre-prints.
  const gpu = ap({
    title: "GPU",
    accent: ARCV2_ACCENT,
    layout: "overlay",
    scrim: false,
    bottomGridCols: 5,
    widgets: [
      sw({ kind: "image", text: ASSET("GPU-bg.png"), asBackground: true }),
      sw({ kind: "text", label: "Capturing:", sensor: RTSS("windowtitle"), fontSize: 16, color: ARCV2_DARK, overlayZone: "top" }),
      // Middle: the big yellow FPS headline + frame time (the "1%/MS" pair).
      sw({ kind: "value", sensor: RTSS("fps"), fontSize: 49, color: ARCV2_ACCENT, overlayZone: "middle" }),
      sw({ kind: "value", sensor: RTSS("current frame time"), unit: "ms", fontSize: 14, color: ARCV2_DARK, overlayZone: "middle" }),
      // Bottom: five value cells sitting under the art's pre-printed columns
      // (1%/MS · POWER W · MEM ° · CORE ° · LOAD) — value-only, the labels
      // are already baked into GPU-bg.png.
      sw({ kind: "value", sensor: RTSS("1% low fps"), fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: NVIDIA("gpu_package"), unit: "W", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: NVIDIA("gpu_memory_junction"), unit: "°C", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: NVIDIA("gpu_core"), unit: "MHz", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: NVIDIA("d3d_3d"), unit: "%", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
    ],
  });

  // — Right column, rows 3–4: the friends table (the export's "Friends"
  //   group: name, status, current game, last-seen).
  const friends = ap({
    title: "Friends",
    accent: ARCV2_ACCENT,
    layout: "grid",
    columns: 1,
    widgets: [
      sw({ kind: "text", label: "Friends", fontSize: 13, color: ARCV2_FAINT }),
      sw({ kind: "table", sensor: STEAM("SteamAPI-Social.friends-activity"), rows: 4, columns: 4, header: "Friend, Status, Playing, Last Online" }),
    ],
  });

  // — Right column, rows 5–6: game news (the export's bottom-right news
  //   group: the current game's headline + the library feed).
  const news = ap({
    title: "News",
    accent: ARCV2_ACCENT,
    layout: "grid",
    columns: 2,
    widgets: [
      sw({ kind: "text", label: "News", sensor: STEAM("SteamAPI-News.current_game_news_title"), fontSize: 16, color: "#ffffff", span: 2 }),
      sw({ kind: "text", label: "Library", sensor: STEAM("SteamAPI-News.library-news"), fontSize: 12, color: ARCV2_FAINT, span: 2 }),
    ],
  });

  // — Center column, rows 5–6: the CPU strip (the export's CPU group):
  //   rolling load sparkline, RAM used/free bars and the stat columns
  //   pre-printed on the CPU-bg art.
  const cpuStrip = ap({
    title: "CPU",
    accent: ARCV2_ACCENT,
    layout: "overlay",
    scrim: false,
    bottomGridCols: 4,
    widgets: [
      sw({ kind: "image", text: ASSET("CPU-bg.png"), asBackground: true }),
      // Top: the rolling CPU-load sparkline across the panel.
      sw({ kind: "sparkline", sensor: AMD("cpu_total"), label: "", history: 60, color: ARCV2_ACCENT, overlayZone: "top" }),
      // Middle: the RAM used / free bars.
      sw({ kind: "bar", label: "RAM USED", sensor: "system.ram.load", max: 100, color: ARCV2_ACCENT, overlayZone: "middle" }),
      sw({ kind: "bar", label: "RAM FREE", sensor: "system.ram.free", max: 100, color: ARCV2_TEAL, overlayZone: "middle" }),
      // Bottom: four value cells under the art's pre-printed columns
      // (LOAD · POWER W · MEM ° · CORE °) — value-only, labels are baked
      // into CPU-bg.png.
      sw({ kind: "value", sensor: AMD("cpu_total"), unit: "%", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: AMD("package"), unit: "W", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: "libre.kingston___kf560c36_32___1__dimm__1", unit: "°C", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: AMD("core__tctl_tdie"), unit: "°C", fontSize: 18, color: ARCV2_DARK, overlayZone: "bottom" }),
    ],
  });

  // — Center column, rows 3–4: the big yellow clock with the date below
  //   (the export's Clock 63px + Calendar 23px), centered across the
  //   column between two thin accent bars.
  const clockPanel = ap({
    title: "Clock",
    accent: ARCV2_ACCENT,
    layout: "grid",
    columns: 3,
    gridCols: "14px 1fr 14px",
    widgets: [
      sw({ kind: "shape", shape: "vbar", thickness: 5, color: ARCV2_ACCENT }),
      sw({ kind: "clock", clock: "both", fontSize: 52, color: ARCV2_ACCENT, align: "center" }),
      sw({ kind: "shape", shape: "vbar", thickness: 5, color: ARCV2_ACCENT }),
    ],
  });

  // — Left column, row 3: the FPS ring row (the export's six gauges:
  //   frame-rate readouts plus GPU core clock and memory temperature).
  const fpsRings = ap({
    title: "FPS rings",
    accent: ARCV2_ACCENT,
    layout: "grid",
    columns: 6,
    widgets: [
      sw({ kind: "gauge", sensor: RTSS("fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("avg-fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("1% low fps"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: RTSS("refreshrate"), max: 240, fontSize: 56 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_core"), max: 3500, fontSize: 56 }),
      sw({ kind: "gauge", sensor: NVIDIA("gpu_memory_junction"), max: 100, fontSize: 56 }),
    ],
  });

  // — Left column, rows 1–2: the SPOTIFY card (yellow panel art from the
  //   export, dark-navy text, cover art in the white slot).
  const spotify = ap({
    title: "Spotify",
    accent: ARCV2_ACCENT,
    layout: "overlay",
    scrim: false,
    widgets: [
      sw({ kind: "image", text: ASSET("SPOTIFY.png"), asBackground: true }),
      sw({ kind: "text", label: "Artist", sensor: SPOTIFY("artist"), fontSize: 19, color: ARCV2_NAVY, overlayZone: "top" }),
      sw({ kind: "text", sensor: SPOTIFY("current-track"), fontSize: 22, color: ARCV2_NAVY, overlayZone: "top" }),
      sw({ kind: "image", sensor: SPOTIFY("cover-art"), height: 90, overlayZone: "top" }),
      sw({ kind: "bar", sensor: SPOTIFY("track-progress"), max: 100, color: ARCV2_NAVY, overlayZone: "middle" }),
      sw({ kind: "value", sensor: SPOTIFY("elapsed-time"), fontSize: 15, color: ARCV2_NAVY, overlayZone: "bottom" }),
      sw({ kind: "value", sensor: SPOTIFY("remaining-time"), fontSize: 15, color: ARCV2_NAVY, visible: false, overlayZone: "bottom" }),
    ],
  });

  // — Left column, row 4: network (the export's NETWORK panel: dark
  //   art with pre-printed labels, teal speed bars, GB/s values).
  const network = ap({
    title: "Network",
    accent: ARCV2_ACCENT,
    layout: "overlay",
    scrim: false,
    widgets: [
      sw({ kind: "image", text: ASSET("NETWORK-bg.png"), asBackground: true }),
      sw({ kind: "bar", sensor: "libre.ethernet_upload_speed", max: 10_000_000, color: ARCV2_TEAL, scale: 1e-9, decimals: 3, unit: "GB/s", overlayZone: "top" }),
      sw({ kind: "bar", sensor: "libre.ethernet_download_speed", max: 10_000_000, color: ARCV2_TEAL, scale: 1e-9, decimals: 3, unit: "GB/s", overlayZone: "top" }),
      sw({ kind: "value", sensor: "libre.ethernet_upload_speed", fontSize: 12, color: ARCV2_ACCENT, scale: 1e-9, decimals: 3, unit: "GB/s", overlayZone: "bottom" }),
      sw({ kind: "value", sensor: "libre.ethernet_download_speed", fontSize: 12, color: ARCV2_ACCENT, scale: 1e-9, decimals: 3, unit: "GB/s", overlayZone: "bottom" }),
    ],
  });

  // — Left column, rows 5–6: weather (current conditions + 7-day
  //   forecast from the bridge's own fetch).
  const weather = ap({
    title: "Weather",
    accent: ARCV2_ACCENT,
    layout: "grid",
    columns: 4,
    widgets: [
      sw({ kind: "image", sensor: WEATHER("weather_icon_url"), height: 36 }),
      sw({ kind: "text", sensor: WEATHER("weather_desc"), fontSize: 14, color: ARCV2_CREAM }),
      sw({ kind: "stat", sensor: WEATHER("temp"), unit: "°C", fontSize: 14, color: ARCV2_CREAM }),
      sw({ kind: "value", sensor: WEATHER("wind_speed"), label: "Wind", unit: "m/s", fontSize: 11, color: ARCV2_CREAM }),
      sw({ kind: "table", sensor: YR_FORECAST_KEY, rows: 7, columns: 5, fontSize: 14, header: "Date, Weather, Temp, Precip, Wind", span: 4 }),
    ],
  });

  return {
    id: ARCV2_PROFILE_ID,
    name: "ARCv2",
    sampleVersion: ARCV2_PROFILE_VERSION,
    width: 1920,
    height: 550,
    cols: 12,
    rows: 6,
    fit: "fill",
    pages: [mainPage([
      // Left column (C1–4): spotify, fps rings, network, weather.
      apPlacement(spotify, 4, { colStart: 1, rowStart: 1, rowSpan: 2 }),
      apPlacement(fpsRings, 4, { colStart: 1, rowStart: 3, rowSpan: 1 }),
      apPlacement(network, 4, { colStart: 1, rowStart: 4, rowSpan: 1 }),
      apPlacement(weather, 4, { colStart: 1, rowStart: 5, rowSpan: 2 }),
      // Center column (C5–8): gpu readout, big clock, cpu strip.
      apPlacement(gpu, 4, { colStart: 5, rowStart: 1, rowSpan: 2 }),
      apPlacement(clockPanel, 4, { colStart: 5, rowStart: 3, rowSpan: 2 }),
      apPlacement(cpuStrip, 4, { colStart: 5, rowStart: 5, rowSpan: 2 }),
      // Right column (C9–12): steam hero, friends, news.
      apPlacement(steamTop, 4, { colStart: 9, rowStart: 1, rowSpan: 2 }),
      apPlacement(friends, 4, { colStart: 9, rowStart: 3, rowSpan: 2 }),
      apPlacement(news, 4, { colStart: 9, rowStart: 5, rowSpan: 2 }),
    ])],
  };
}

