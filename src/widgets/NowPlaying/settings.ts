// The legacy media widgets' settings (spotifymodern / mediamodern), shared with the NowPlaying
// template module, and the mapping from those stored keys to NowPlaying props.
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { LIVE_TUNING_DEFAULTS, LIVE_TUNING_KEYS, type LiveTuning, type VizEngine } from "../core/media-progress";
import type { NowPlayingProps } from "../NowPlaying";
import { oneOf } from "../registry/settings-kit";

/** The audio-level-meter plugin, which drives the visualizers' live level. */
export const AUDIO_LEVEL = "plugins.audio-level-meter.";

/** The legacy modules' own settings, after the standard block and the idle switch (keys and defaults unchanged). */
export const MEDIA_SETTINGS: ModuleSetting[] = [
  { key: "showTimes", label: "Times", type: "boolean", default: true, group: "Now playing" },
  { key: "showProgress", label: "Progress", type: "boolean", default: true, group: "Now playing" },
  { key: "tint", label: "Tint from cover art", type: "boolean", default: true, group: "Cover art" },
  {
    key: "artBackground",
    label: "Cover art background (blurred)",
    type: "boolean",
    default: false,
    group: "Cover art",
  },
  {
    key: "waveform",
    label: "Live waveform (audiocn)",
    type: "boolean",
    default: false,
    group: "Waveform",
  },
  {
    key: "waveformVariant",
    label: "Waveform style",
    type: "select",
    default: "bars",
    options: [
      { value: "bars", label: "Bars" },
      { value: "line", label: "Line" },
      { value: "mirror", label: "Mirror" },
    ],
    group: "Waveform",
  },
  {
    key: "waveformMode",
    label: "Waveform mode",
    type: "select",
    default: "scrolling",
    options: [
      { value: "scrolling", label: "Scrolling (level history)" },
      { value: "static", label: "Static (current bands)" },
    ],
    group: "Waveform",
  },
  {
    key: "waveformSensitivity",
    label: "Waveform sensitivity (gain)",
    type: "number",
    default: 1,
    min: 0.1,
    max: 4,
    step: 0.1,
    group: "Waveform",
  },
  {
    key: "waveformActive",
    label: "Waveform active (off = idle dotted line)",
    type: "boolean",
    default: true,
    group: "Waveform",
  },
  {
    key: "visualizer",
    label: "Bar visualizer (audiocn)",
    type: "boolean",
    default: false,
    group: "Visualizer",
  },
  {
    key: "visualizerBarCount",
    label: "Visualizer bar count",
    type: "number",
    default: 24,
    min: 4,
    max: 64,
    step: 2,
    group: "Visualizer",
  },
  {
    key: "visualizerAlign",
    label: "Visualizer alignment",
    type: "select",
    default: "center",
    options: [
      { value: "center", label: "Center" },
      { value: "start", label: "Start" },
      { value: "end", label: "End" },
    ],
    group: "Visualizer",
  },
  {
    key: "visualizerMirrored",

    advanced: true,
    label: "Visualizer mirrored",
    type: "boolean",
    default: false,
    group: "Visualizer",
  },
  {
    key: "visualizerMinLevel",

    advanced: true,
    label: "Visualizer resting bar size",
    type: "number",
    default: 0.08,
    min: 0,
    max: 0.5,
    step: 0.02,
    group: "Visualizer",
  },
  {
    key: "visualizerIdle",
    label: "Visualizer idle behavior",
    type: "select",
    default: "static",
    options: [
      { value: "static", label: "Static" },
      { value: "pulse", label: "Pulse" },
      { value: "wave", label: "Wave" },
    ],
    group: "Visualizer",
  },
  {
    key: "visualizerLoading",

    advanced: true,
    label: "Visualizer loading sweep",
    type: "boolean",
    default: false,
    group: "Visualizer",
  },
  {
    key: "visualizerOrientation",

    advanced: true,
    label: "Visualizer orientation",
    type: "select",
    default: "horizontal",
    options: [
      { value: "horizontal", label: "Horizontal" },
      { value: "vertical", label: "Vertical" },
    ],
    group: "Visualizer",
  },
  {
    key: "waveformBarWidth",

    advanced: true,
    label: "Waveform bar width (px)",
    type: "number",
    default: 3,
    min: 1,
    max: 12,
    step: 1,
    group: "Waveform shape",
  },
  {
    key: "waveformBarGap",

    advanced: true,
    label: "Waveform bar gap (px)",
    type: "number",
    default: 1,
    min: 0,
    max: 8,
    step: 1,
    group: "Waveform shape",
  },
  {
    key: "waveformBarRadius",

    advanced: true,
    label: "Waveform bar radius (px)",
    type: "number",
    default: 1.5,
    min: 0,
    max: 8,
    step: 0.5,
    group: "Waveform shape",
  },
  {
    key: "waveformMinBarHeight",

    advanced: true,
    label: "Waveform min bar height (px)",
    type: "number",
    default: 4,
    min: 0,
    max: 40,
    step: 1,
    group: "Waveform shape",
  },
  {
    key: "waveformLineWidth",

    advanced: true,
    label: "Waveform line width (px)",
    type: "number",
    default: 1.5,
    min: 0.5,
    max: 6,
    step: 0.5,
    group: "Waveform shape",
  },
  {
    key: "waveformFadeEdges",

    advanced: true,
    label: "Waveform edge fade",
    type: "boolean",
    default: true,
    group: "Waveform shape",
  },
  {
    key: "waveformFadeWidth",

    advanced: true,
    label: "Waveform fade width (px)",
    type: "number",
    default: 24,
    min: 0,
    max: 200,
    step: 4,
    group: "Waveform shape",
  },
  {
    key: "liveSource",

    tab: "data",
    label: "Live level source (audio device)",
    type: "select",
    default: "",
    optionsFrom: "sources",
    sourcePlugin: AUDIO_LEVEL,
    group: "Audio source",
  },
  {
    key: "liveCapture",

    tab: "data",
    label: "Live capture (Web Audio, real-time)",
    type: "boolean",
    default: false,
    group: "Audio source",
  },
  {
    key: "liveSources",

    tab: "data",
    label: "Capture devices (one visualizer row each)",
    type: "select",
    default: "",
    optionsFrom: "media",
    multiple: true,
    group: "Audio source",
  },
];

/** The template layout, stored as `playerLayout` (the standard `layout` keeps its meaning). */
export const PLAYER_LAYOUT: ModuleSetting = {
  key: "playerLayout",
  label: "Player layout",
  type: "select",
  default: "card",
  options: [
    { value: "card", label: "Card" },
    { value: "vinyl", label: "Vinyl" },
    { value: "backdrop", label: "Backdrop" },
    { value: "wave", label: "Wave" },
  ],
  group: "Now playing",
};

/** What draws the visualiser in the template (the legacy modules pick it from `waveform` / `visualizer`). */
export const VIZ_ENGINE: ModuleSetting = {
  key: "vizEngine",
  label: "Visualizer engine",
  type: "select",
  default: "mini",
  options: [
    { value: "mini", label: "Inline canvas" },
    { value: "waveform", label: "Live waveform" },
    { value: "bars", label: "Bar visualizer" },
  ],
  group: "Visualizer",
};

/**
 * The pinned Web Audio capture devices (one visualizer row each). Only active while `liveCapture`
 * is on; the comma-separated `liveSources` value is split into stable device ids. Empty → the
 * single sensor row.
 */
export function captureDeviceIdsOf(s: ModuleSettings): string[] | undefined {
  if (!s.liveCapture) return undefined;
  const ids = String(s.liveSources ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

/** The live engines' options from their stored keys (unset keys keep the engine default). */
export function liveTuningOf(s: ModuleSettings): Partial<LiveTuning> {
  const out: Record<string, unknown> = {};
  for (const key of LIVE_TUNING_KEYS) {
    const v = s[key];
    if (v === undefined || v === "") continue;
    const def = LIVE_TUNING_DEFAULTS[key];
    out[key] = typeof def === "number" ? Number(v) : typeof def === "boolean" ? Boolean(v) : String(v);
  }
  return out as Partial<LiveTuning>;
}

/** The props both the legacy modules and the template module read from the shared keys. */
export function sharedPropsOf(s: ModuleSettings): Partial<NowPlayingProps> {
  return {
    layout: oneOf(s.playerLayout, ["card", "vinyl", "backdrop", "wave"]),
    showTimes: s.showTimes === undefined ? undefined : Boolean(s.showTimes),
    showProgress: s.showProgress === undefined ? undefined : Boolean(s.showProgress),
    tint: s.tint === undefined ? undefined : Boolean(s.tint),
    artBackground: s.artBackground === undefined ? undefined : Boolean(s.artBackground),
    captureDevices: captureDeviceIdsOf(s),
    ...liveTuningOf(s),
  };
}

/**
 * The legacy modules' props: `visualizer` (bar visualizer, wins) or `waveform` (live waveform)
 * replace the progress bar; `visualizerMirrored` / `waveformVariant` become the engine's `vizMode`;
 * `liveSource` "" = the loudest live device.
 */
export function legacyPropsOf(s: ModuleSettings, source: "spotify" | "media"): Partial<NowPlayingProps> {
  const engine: VizEngine | undefined = s.visualizer ? "bars" : s.waveform ? "waveform" : undefined;
  return {
    ...sharedPropsOf(s),
    source,
    progress: engine ? "visualizer" : "bar",
    vizEngine: engine ?? "mini",
    vizMode: s.visualizer ? (s.visualizerMirrored ? "mirror" : "bars") : oneOf(s.waveformVariant, ["bars", "line", "mirror"]),
    vizDevice: String(s.liveSource ?? ""),
  };
}
