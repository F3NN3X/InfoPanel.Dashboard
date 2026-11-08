// Template widgets, group D: gaming (see _docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSettings, PaletteRole } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import { boolSetting, colorSetting, enumSetting, listOf, numberOf, numberSetting, oneOf, splitKeys, textSetting, viewOnly, viewSetting, viewsExcept, type ColorEntry } from "../shared/settings-kit";
import type { FpsMonitorProps } from "../FpsMonitor";
import { meta as fpsMonitorMeta } from "../meta/FpsMonitor";
import type { FramePacingProps } from "../FramePacing";
import { meta as framePacingMeta } from "../meta/FramePacing";
import { FPS_LOOK_SETTINGS, fpsLookProps, targetOf, targetSetting } from "../fps-settings";
import { fpsIsland } from "../island/gaming";
import type { GameSpotlightProps } from "../GameSpotlight";
import { meta as gameSpotlightMeta } from "../meta/GameSpotlight";
import { SPOTLIGHT_COMPOSITE_SETTINGS, SPOTLIGHT_LAYOUT_SETTING, compositeProps } from "../spotlight-settings";
import type { PlaytimeShareProps } from "../PlaytimeShare";
import { PALETTE, meta as playtimeShareMeta } from "../meta/PlaytimeShare";

// Each component loads in its own chunk, the first time a zone draws it.
const FpsMonitor = lazyWidget(() => import("../FpsMonitor"));
const FramePacing = lazyWidget(() => import("../FramePacing"));
const GameSpotlight = lazyWidget(() => import("../GameSpotlight"));
const PlaytimeShare = lazyWidget(() => import("../PlaytimeShare"));

/** The gauge and trend views read the metrics, sparkline and colours; the frame-time graph reads none of them. */
const gaugeOnly = viewOnly(fpsMonitorMeta, "gauge", "trend");
/** GameSpotlight layouts that draw their own fixed gradient instead of the scrim. */
const FIXED_SCRIM = ["ticker", "poster"];
const layoutIs = (...layouts: string[]) => viewOnly(gameSpotlightMeta, ...layouts);

/** The slices follow the theme's Series 1 to 6. */
const PLAYTIME_ROLES = ["s1", "s2", "s3", "s4", "s5", "s6"] as const satisfies readonly PaletteRole[];
const PLAYTIME_COLORS: ColorEntry[] = PALETTE.map((_, i) => ({ entry: String(i), key: `color${i + 1}`, label: `Slice ${i + 1}` }));
/** The slice colours: a stored `colors` list, else the per-slice colours (an unset slice keeps its default). */
function playtimeColors(s: ModuleSettings): string[] | undefined {
  const list = listOf(s.colors, (x) => (typeof x === "string" && x ? x : undefined));
  if (list?.length) return list;
  const set = PLAYTIME_COLORS.map((c) => String(s[c.key] ?? "").trim());
  return set.some(Boolean) ? set.map((c, i) => c || PALETTE[i]) : undefined;
}

/** Budget lines in Hz: a stored list or a comma-separated string ("" = the widget's default). */
const hzList = (v: unknown): number[] | undefined => {
  const l = Array.isArray(v) ? listOf(v, numberOf) : splitKeys(v).map(numberOf).filter((n): n is number => n !== undefined);
  return l?.length ? l : undefined;
};

export const GROUP_D: DashboardModule[] = [
  templateModule<Pick<FpsMonitorProps, "target" | "view" | "showMetrics" | "sparkline" | "ringColor" | "sparkColor">>({
    meta: fpsMonitorMeta,
    Component: FpsMonitor,
    settings: [
      viewSetting(fpsMonitorMeta, { bundleDefaults: { sparkline: false }, group: "Display", hint: "Trend is the gauge with the sparkline on." }),
      ...FPS_LOOK_SETTINGS.map(gaugeOnly),
      targetSetting,
    ],
    toProps: (s: ModuleSettings) => ({ target: targetOf(s.target), ...fpsLookProps(s) }),
    island: fpsIsland,
  }),
  templateModule<Pick<GameSpotlightProps, "layout" | "motion" | "scrim" | "music" | "progress" | "vizMode" | "showStats" | "showNews">>({
    meta: gameSpotlightMeta,
    Component: GameSpotlight,
    settings: [
      SPOTLIGHT_LAYOUT_SETTING,
      ...SPOTLIGHT_COMPOSITE_SETTINGS.map(layoutIs("composite")),
      layoutIs("combo")(enumSetting("music", "Music source", "media", [{ value: "media", label: "Media" }, { value: "spotify", label: "Spotify" }], { group: "Music card" })),
      layoutIs("combo")(enumSetting("progress", "Music progress", "wave", [{ value: "wave", label: "Wave" }, { value: "visualizer", label: "Visualizer" }], { group: "Music card" })),
      layoutIs("combo")(enumSetting("vizMode", "Visualizer mode", "bars", ["bars", "mirror", "wave", "dots", "line"].map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) })), { group: "Music card", visibleIf: (v) => v.progress === "visualizer" })),
      layoutIs(...viewsExcept(gameSpotlightMeta, ...FIXED_SCRIM))(numberSetting("scrim", "Scrim darkness", 0.6, { min: 0, max: 1, step: 0.05, group: "Layout" })),
      layoutIs(...viewsExcept(gameSpotlightMeta, "poster"))(boolSetting("motion", "Ken Burns motion", true, { group: "Dynamics", tab: "behaviour" })),
    ],
    toProps: (s) => ({
      // The standard `layout` keeps its meaning; the template's own layout is stored as `spotlightLayout`.
      layout: oneOf(s.spotlightLayout, ["hero", "poster", "logo", "ticker", "combo", "composite"]),
      ...compositeProps(s),
      motion: typeof s.motion === "boolean" ? s.motion : undefined,
      scrim: numberOf(s.scrim),
      music: oneOf(s.music, ["media", "spotify"]),
      progress: oneOf(s.progress, ["wave", "visualizer"]),
      vizMode: oneOf(s.vizMode, ["bars", "mirror", "wave", "dots", "line"]),
    }),
  }),
  templateModule<Pick<FramePacingProps, "budgets" | "window">>({
    meta: framePacingMeta,
    Component: FramePacing,
    settings: [
      textSetting("budgets", "Budget lines (Hz, comma-separated)", "", { group: "Budget lines", hint: "Empty = refresh rate and 60" }),
      numberSetting("window", "Samples", 120, { min: 30, max: 600, step: 10, group: "History", tab: "behaviour" }),
    ],
    toProps: (s) => ({ budgets: hzList(s.budgets), window: numberOf(s.window) }),
  }),
  templateModule<Pick<PlaytimeShareProps, "colors">>({
    meta: playtimeShareMeta,
    Component: PlaytimeShare,
    settings: PLAYTIME_COLORS.map((c, i) => colorSetting(c.key, c.label, { role: PLAYTIME_ROLES[i], more: false })),
    toProps: (s) => ({ colors: playtimeColors(s) }),
  }),
];
