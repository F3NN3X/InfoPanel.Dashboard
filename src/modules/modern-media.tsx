import {
  ModernNowPlaying,
  type ModernStyle,
  type ModernVariant,
} from "@/components/ModernNowPlaying";
import { imageUrl } from "@/lib/image";
import {
  bySuffixOrName,
  entry,
  groupByContainer,
  liveText,
  type KeyedSensor,
} from "@/lib/sensors";
import type { BarIdle } from "@/lib/audio/bar-levels";
import type { Orientation } from "@/lib/audio/types";
import { chromeOf, IDLE_SETTING, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
  type SensorMap,
} from "./types";

/** The audio-level-meter plugin, which drives the visualizers' live level. */
const AUDIO_LEVEL = "plugins.audio-level-meter.";

/**
 * Modern now-playing widgets — the adaptive redesign of Now Playing / Media.
 *
 * One component (`ModernNowPlaying`) renders four layouts and picks the one
 * that fits the zone's measured size (card / standard / compact / simple),
 * with a cover-art-tinted surface. Two modules register it:
 *
 * - `spotifymodern` — the spotify-plugin / direct-push keys
 * - `mediamodern`   — the media-plugin keys (adds elapsed/remaining times)
 */

const MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  IDLE_SETTING,
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

/**
 * The pinned Web Audio capture devices (one visualizer row each). Only active
 * while `liveCapture` is on; the comma-separated `liveSources` value is split
 * into stable device ids. Empty/undefined → fall back to the single sensor
 * row.
 */
function captureDeviceIdsOf(cfg: ModuleSettings): string[] | undefined {
  if (!Boolean(cfg.liveCapture)) return undefined;
  const ids = String(cfg.liveSources ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

function modernProps(mod: DashboardModule, s?: ModuleSettings) {
  const cfg = effectiveSettings(mod, s);
  return {
    variant: String(cfg.layout) as ModernVariant | "auto",
    style: String(cfg.surface) as ModernStyle,
    tint: Boolean(cfg.tint),
    artBackground: Boolean(cfg.artBackground),
    showTimes: Boolean(cfg.showTimes),
    showProgress: Boolean(cfg.showProgress),
    waveform: Boolean(cfg.waveform),
    waveformVariant: String(cfg.waveformVariant) as
      | "bars"
      | "line"
      | "mirror",
    waveformMode: String(cfg.waveformMode) as "scrolling" | "static",
    waveformBarWidth: Number(cfg.waveformBarWidth),
    waveformBarGap: Number(cfg.waveformBarGap),
    waveformBarRadius: Number(cfg.waveformBarRadius),
    waveformMinBarHeight: Number(cfg.waveformMinBarHeight),
    waveformLineWidth: Number(cfg.waveformLineWidth),
    waveformFadeEdges: Boolean(cfg.waveformFadeEdges),
    waveformFadeWidth: Number(cfg.waveformFadeWidth),
    waveformActive: Boolean(cfg.waveformActive),
    waveformSensitivity: Number(cfg.waveformSensitivity),
    visualizer: Boolean(cfg.visualizer),
    visualizerBarCount: Number(cfg.visualizerBarCount),
    visualizerAlign: String(cfg.visualizerAlign) as "center" | "start" | "end",
    visualizerMirrored: Boolean(cfg.visualizerMirrored),
    visualizerMinLevel: Number(cfg.visualizerMinLevel),
    visualizerIdle: String(cfg.visualizerIdle) as BarIdle,
    visualizerLoading: Boolean(cfg.visualizerLoading),
    visualizerOrientation: String(cfg.visualizerOrientation) as Orientation,
    captureDeviceIds: captureDeviceIdsOf(cfg),
    chrome: chromeOf(cfg),
  };
}

/**
 * The live system audio level (0..1) that drives the audiocn visualizers:
 * the AudioLevelMeter plugin's `audio-level` (VU %, 0–100). A pinned
 * `liveSource` device is used as-is; `"all sources"` (the default) — and a
 * pinned device that is no longer live — fall back to the *loudest* live
 * device, so music routed to a virtual / secondary device (Elgato Virtual
 * Audio setups) still drives the visualizer. No plugin → undefined (the
 * visualizers show their idle state).
 */
function liveLevelOf(
  sensors: SensorMap,
  cfg: ModuleSettings
): number | undefined {
  const groups = groupByContainer(sensors, AUDIO_LEVEL);
  if (groups.size === 0) return undefined;

  const levelOf = (items: KeyedSensor[]): number | undefined =>
    bySuffixOrName(items, "audio-level", "Level")?.value;

  const wanted = String(cfg.liveSource ?? "");
  if (wanted) {
    const value = groups.get(wanted) ? levelOf(groups.get(wanted)!) : undefined;
    if (value !== undefined) {
      return Math.min(1, Math.max(0, value / 100));
    }
  }

  let best: number | undefined;
  for (const items of groups.values()) {
    const value = levelOf(items);
    if (value !== undefined && (best === undefined || value > best)) {
      best = value;
    }
  }
  if (best === undefined) return undefined;
  return Math.min(1, Math.max(0, best / 100));
}

function resolve(sensors: SensorMap, primary: string, fallback: string) {
  return sensors[primary] ?? sensors[fallback];
}

export const spotifyModernModule: DashboardModule = {
  id: "spotifymodern",
  title: "Spotify (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: ["spotify.", "plugins.spotify-plugin."],
  reads: [AUDIO_LEVEL],
  settings: MODERN_SETTINGS,
  // Idle = not playing (paused or stopped).
  isIdle: (sensors) =>
    resolve(sensors, "spotify.playing", "plugins.spotify-plugin.spotify.playback-state")
      ?.value !== 2,
  render: (sensors, s) => {
    const cfg = modernProps(spotifyModernModule, s);
    const track = resolve(
      sensors,
      "spotify.track",
      "plugins.spotify-plugin.spotify.current-track"
    )?.text;
    const artist = resolve(
      sensors,
      "spotify.artist",
      "plugins.spotify-plugin.spotify.artist"
    )?.text;
    const art = resolve(
      sensors,
      "spotify.art",
      "plugins.spotify-plugin.spotify.cover-art"
    )?.text;
    const progress =
      resolve(
        sensors,
        "spotify.progress",
        "plugins.spotify-plugin.spotify.track-progress"
      )?.value ?? 0;
    const playback =
      resolve(
        sensors,
        "spotify.playing",
        "plugins.spotify-plugin.spotify.playback-state"
      )?.value;

    return (
      <ModernNowPlaying
        track={track}
        artist={artist}
        artUrl={imageUrl(art, "art")}
        progress={progress}
        isPlaying={playback === 2}
        liveLevel={liveLevelOf(sensors, effectiveSettings(spotifyModernModule, s))}
        {...cfg}
      />
    );
  },
};

const P = "plugins.media-plugin.";
const C = "media";

export const mediaModernModule: DashboardModule = {
  id: "mediamodern",
  title: "Media (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  reads: [AUDIO_LEVEL],
  settings: MODERN_SETTINGS,
  // Idle = not playing (paused or stopped).
  isIdle: (sensors) => entry(sensors, P, C, "playback-state")?.value !== 2,
  render: (sensors, s) => {
    const cfg = modernProps(mediaModernModule, s);
    const track = liveText(entry(sensors, P, C, "current-track"));
    const artist = liveText(entry(sensors, P, C, "artist"));
    const cover = liveText(entry(sensors, P, C, "cover-art"));
    const progress = entry(sensors, P, C, "track-progress")?.value ?? 0;
    const elapsed = liveText(entry(sensors, P, C, "elapsed-time"));
    const remaining = liveText(entry(sensors, P, C, "remaining-time"));
    const playback = entry(sensors, P, C, "playback-state")?.value;

    return (
      <ModernNowPlaying
        track={track}
        artist={artist}
        artUrl={imageUrl(cover, "cover-art")}
        progress={progress}
        elapsed={elapsed}
        remaining={remaining}
        isPlaying={playback === 2}
        liveLevel={liveLevelOf(sensors, effectiveSettings(mediaModernModule, s))}
        {...cfg}
      />
    );
  },
};
