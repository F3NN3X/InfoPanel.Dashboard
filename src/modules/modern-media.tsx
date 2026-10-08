import {
  ModernNowPlaying,
  type ModernStyle,
  type ModernVariant,
} from "@/components/ModernNowPlaying";
import { isImageUrl } from "@/lib/image";
import {
  bySuffixOrName,
  entry,
  groupByContainer,
  liveText,
  type KeyedSensor,
} from "@/lib/sensors";
import type { BarIdle } from "@/lib/audio/bar-levels";
import type { Orientation } from "@/lib/audio/types";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
  type SensorMap,
} from "./types";

/**
 * Modern now-playing widgets — the adaptive redesign of Now Playing / Media.
 *
 * One component (`ModernNowPlaying`) renders four layouts and picks the one
 * that fits the zone's measured size (card / standard / compact / simple),
 * with a cover-art-tinted surface. Two modules register it:
 *
 * - `spotifymodern` — the spotify-plugin / direct-push keys
 * - `mediamodern`   — the media-plugin keys (adds elapsed/remaining times)
 *
 * The classic `spotify` / `media` modules are left untouched.
 */

const MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  { key: "tint", label: "Tint from cover art", type: "boolean", default: true },
  { key: "showTimes", label: "Times", type: "boolean", default: true },
  { key: "showProgress", label: "Progress", type: "boolean", default: true },
  {
    key: "waveform",
    label: "Live waveform (audiocn)",
    type: "boolean",
    default: false,
  },
  {
    key: "visualizer",
    label: "Bar visualizer (audiocn)",
    type: "boolean",
    default: false,
  },
  {
    key: "liveSource",
    label: "Live level source (audio device)",
    type: "select",
    default: "",
    optionsFrom: "sources",
    sourcePlugin: "plugins.audio-level-meter.",
  },
  {
    key: "liveCapture",
    label: "Live capture (Web Audio, real-time)",
    type: "boolean",
    default: false,
  },
  {
    key: "liveSources",
    label: "Capture devices (one visualizer row each)",
    type: "select",
    default: "",
    optionsFrom: "media",
    multiple: true,
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
  },
  {
    key: "waveformBarWidth",
    label: "Waveform bar width (px)",
    type: "number",
    default: 3,
    min: 1,
    max: 12,
    step: 1,
  },
  {
    key: "waveformBarGap",
    label: "Waveform bar gap (px)",
    type: "number",
    default: 1,
    min: 0,
    max: 8,
    step: 1,
  },
  {
    key: "waveformBarRadius",
    label: "Waveform bar radius (px)",
    type: "number",
    default: 1.5,
    min: 0,
    max: 8,
    step: 0.5,
  },
  {
    key: "waveformMinBarHeight",
    label: "Waveform min bar height (px)",
    type: "number",
    default: 4,
    min: 0,
    max: 40,
    step: 1,
  },
  {
    key: "waveformLineWidth",
    label: "Waveform line width (px)",
    type: "number",
    default: 1.5,
    min: 0.5,
    max: 6,
    step: 0.5,
  },
  {
    key: "waveformFadeEdges",
    label: "Waveform edge fade",
    type: "boolean",
    default: true,
  },
  {
    key: "waveformFadeWidth",
    label: "Waveform fade width (px)",
    type: "number",
    default: 24,
    min: 0,
    max: 200,
    step: 4,
  },
  {
    key: "waveformSensitivity",
    label: "Waveform sensitivity (gain)",
    type: "number",
    default: 1,
    min: 0.1,
    max: 4,
    step: 0.1,
  },
  {
    key: "waveformActive",
    label: "Waveform active (off = idle dotted line)",
    type: "boolean",
    default: true,
  },
  {
    key: "visualizerBarCount",
    label: "Visualizer bar count",
    type: "number",
    default: 24,
    min: 4,
    max: 64,
    step: 2,
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
  },
  {
    key: "visualizerMirrored",
    label: "Visualizer mirrored",
    type: "boolean",
    default: false,
  },
  {
    key: "visualizerMinLevel",
    label: "Visualizer resting bar size",
    type: "number",
    default: 0.08,
    min: 0,
    max: 0.5,
    step: 0.02,
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
  },
  {
    key: "visualizerLoading",
    label: "Visualizer loading sweep",
    type: "boolean",
    default: false,
  },
  {
    key: "visualizerOrientation",
    label: "Visualizer orientation",
    type: "select",
    default: "horizontal",
    options: [
      { value: "horizontal", label: "Horizontal" },
      { value: "vertical", label: "Vertical" },
    ],
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
  const groups = groupByContainer(sensors, "plugins.audio-level-meter.");
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
  title: "Now Playing (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) =>
    key.startsWith("spotify.") || key.startsWith("plugins.spotify-plugin."),
  settings: MODERN_SETTINGS,
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
        artUrl={art && isImageUrl(art, "art") ? art : undefined}
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
  matches: (key) => key.startsWith(P),
  settings: MODERN_SETTINGS,
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
        artUrl={cover && isImageUrl(cover, "cover-art") ? cover : undefined}
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
