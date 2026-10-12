// Template widgets, group D: gaming (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import Achievements, { meta as achievementsMeta, type AchievementsProps } from "../Achievements";
import FpsMonitor, { meta as fpsMonitorMeta, type FpsMonitorProps } from "../FpsMonitor";
import FramePacing, { meta as framePacingMeta, type FramePacingProps } from "../FramePacing";
import { FPS_LOOK_SETTINGS, fpsLookProps } from "../fps-settings";
import GameSpotlight, { meta as gameSpotlightMeta, type GameSpotlightProps } from "../GameSpotlight";
import { SPOTLIGHT_COMPOSITE_SETTINGS, SPOTLIGHT_LAYOUT_SETTING, compositeProps } from "../spotlight-settings";
import OsdStrip, { meta as osdStripMeta, type OsdCell, type OsdStripProps } from "../OsdStrip";
import PlaytimeShare, { meta as playtimeShareMeta, type PlaytimeShareProps } from "../PlaytimeShare";
import SteamGame, { meta as steamGameMeta, type SteamGameProps } from "../SteamGame";
import SteamLibrary, { meta as steamLibraryMeta, type SteamLibraryProps } from "../SteamLibrary";
import SteamNews, { meta as steamNewsMeta, type SteamNewsProps } from "../SteamNews";
import SteamProfile, { meta as steamProfileMeta, type SteamProfileProps } from "../SteamProfile";

/** A stored number, or undefined when unset or not numeric. */
const numberOf = (v: unknown): number | undefined => (v === undefined || v === "" || v === null || !Number.isFinite(Number(v)) ? undefined : Number(v));
/** A stored value that is one of `allowed`, or undefined. */
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => allowed.find((a) => a === v);
/** A stored list, narrowed item by item; undefined when it is not a list. */
const listOf = <T>(v: unknown, item: (x: unknown) => T | undefined): T[] | undefined =>
  Array.isArray(v) ? v.map(item).filter((x): x is T => x !== undefined) : undefined;
const boolOf = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

const OSD_CELLS = ["fps", "low", "ft", "gpu", "cpu", "vram", "display"] as const satisfies readonly OsdCell[];

export const GROUP_D: DashboardModule[] = [
  templateModule<Pick<FpsMonitorProps, "target" | "view" | "showMetrics" | "sparkline" | "ringColor" | "sparkColor">>({
    meta: fpsMonitorMeta,
    Component: FpsMonitor,
    settings: [
      {
        key: "view",
        label: "View",
        type: "select",
        default: "frametime",
        options: [
          { value: "frametime", label: "Frame-time graph" },
          { value: "gauge", label: "Gauge" },
          { value: "trend", label: "Trend", applies: { sparkline: true } },
        ],
        group: "Content",
      },
      ...FPS_LOOK_SETTINGS,
    ],
    toProps: (s: ModuleSettings) => ({ target: numberOf(s.target), ...fpsLookProps(s) }),
  }),
  templateModule<Pick<GameSpotlightProps, "layout" | "motion" | "scrim" | "music" | "progress" | "vizMode" | "showStats" | "showNews">>({
    meta: gameSpotlightMeta,
    Component: GameSpotlight,
    settings: [SPOTLIGHT_LAYOUT_SETTING, ...SPOTLIGHT_COMPOSITE_SETTINGS],
    toProps: (s) => ({
      // The standard `layout` keeps its meaning; the template's own layout is stored as `spotlightLayout`.
      layout: oneOf(s.spotlightLayout, ["hero", "poster", "logo", "ticker", "combo", "composite"]),
      ...compositeProps(s),
      motion: boolOf(s.motion),
      scrim: numberOf(s.scrim),
      music: oneOf(s.music, ["media", "spotify"]),
      progress: oneOf(s.progress, ["wave", "visualizer"]),
      vizMode: oneOf(s.vizMode, ["bars", "mirror", "wave", "dots", "line"]),
    }),
  }),
  templateModule<Pick<OsdStripProps, "cells" | "target">>({
    meta: osdStripMeta,
    Component: OsdStrip,
    settings: [],
    toProps: (s) => ({ cells: listOf(s.cells, (x) => oneOf(x, OSD_CELLS)), target: numberOf(s.target) }),
  }),
  templateModule<Pick<FramePacingProps, "budgets" | "window">>({
    meta: framePacingMeta,
    Component: FramePacing,
    settings: [],
    toProps: (s) => ({ budgets: listOf(s.budgets, numberOf), window: numberOf(s.window) }),
  }),
  templateModule<Pick<PlaytimeShareProps, "colors">>({
    meta: playtimeShareMeta,
    Component: PlaytimeShare,
    settings: [],
    toProps: (s) => ({ colors: listOf(s.colors, (x) => (typeof x === "string" && x ? x : undefined)) }),
  }),
  templateModule<Pick<SteamProfileProps, never>>({ meta: steamProfileMeta, Component: SteamProfile, settings: [], toProps: () => ({}) }),
  templateModule<Pick<SteamGameProps, "art" | "scrim">>({
    meta: steamGameMeta,
    Component: SteamGame,
    settings: [],
    toProps: (s) => ({ art: oneOf(s.art, ["banner", "grid", "none"]), scrim: numberOf(s.scrim) }),
  }),
  templateModule<Pick<AchievementsProps, "display">>({ meta: achievementsMeta, Component: Achievements, settings: [], toProps: (s) => ({ display: oneOf(s.display, ["ring", "pips"]) }) }),
  templateModule<Pick<SteamLibraryProps, "showNews">>({ meta: steamLibraryMeta, Component: SteamLibrary, settings: [], toProps: (s) => ({ showNews: boolOf(s.showNews) }) }),
  templateModule<Pick<SteamNewsProps, "lines">>({ meta: steamNewsMeta, Component: SteamNews, settings: [], toProps: (s) => ({ lines: numberOf(s.lines) }) }),
];
