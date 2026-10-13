// Template widgets, group C: media / audio (see docs/redesign/phase9/brief-9.3c-templates.md).
import { audioSettings, ballisticsOf } from "@/modules/audio-modern";
import { WAVELINK_SETTINGS, wavelinkToProps } from "@/modules/wavelink-modern";
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import { boolOf, boolSetting, colorSetting, deviceSetting, enumSetting, numberOf, numberSetting, oneOf, pick, splitKeys, stringOf } from "./settings-kit";
import AudioMeter, { meta as audioMeter, type AudioMeterProps } from "../AudioMeter";
import MeterBridge, { meta as meterBridge, type MeterBridgeProps } from "../MeterBridge";
import NowPlaying, { meta as nowPlaying, type NowPlayingProps } from "../NowPlaying";
import { MEDIA_SETTINGS, NOW_PLAYING_OWN, PLAYER_LAYOUT, sharedPropsOf, vizStyleOf } from "../NowPlaying/settings";
import { VIZ_SHAPE_GROUP, vizColorSettings, vizDynamicsSettings, vizLookOf, vizShapeSettings } from "./viz-settings";
import Visualizer, { meta as visualizer, type VisualizerProps } from "../Visualizer";
import VolumeMixer, { meta as volumeMixer, type VolumeMixerProps } from "../VolumeMixer";
import WaveLink, { meta as waveLink } from "../WaveLink";

/**
 * The legacy media keys a new NowPlaying zone does not offer: the engine-picking and mapped keys, the
 * old engines' shape keys (still read from saved values, `tuningLookOf`) and the synthesised idle
 * animations (no longer drawn).
 */
const LEGACY_ONLY = [
  "waveform",
  "visualizer",
  "waveformVariant",
  "visualizerMirrored",
  "liveSource",
  "waveformMode",
  "waveformBarWidth",
  "waveformBarGap",
  "waveformBarRadius",
  "waveformMinBarHeight",
  "waveformActive",
  "visualizerIdle",
  "visualizerLoading",
];
/** The old engines' keys the template keeps, filed with the visualiser. */
const TEMPLATE_GROUPS: Record<string, Partial<ModuleSetting>> = {
  waveformSensitivity: { group: "Visualizer", label: "Sensitivity (gain)" },
  waveformLineWidth: { group: VIZ_SHAPE_GROUP, label: "Line width (px)" },
  waveformFadeEdges: { group: VIZ_SHAPE_GROUP, label: "Edge fade" },
  waveformFadeWidth: { group: VIZ_SHAPE_GROUP, label: "Fade width (px)" },
  // the template draws untinted unless asked
  tint: { default: false },
  liveCapture: { hint: "Needs the profile set to Interactive once, then Allow in the prompt; captures an input device (a loopback such as a Wave Link output)." },
};
const METER_STYLES = ["led", "bar", "solid", "vu", "ring", "mirror", "wave"] as const;
const VIZ_MODES = ["bars", "mirror", "radial", "wave", "blob", "dots", "line", "scroll"] as const;
const opts = (values: readonly string[]) => values.map((v) => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }));
/** A segment count where 0 = the widget sizes it to the zone. */
const autoCount = (v: unknown): number | undefined => {
  const n = numberOf(v);
  return n !== undefined && n > 0 ? n : undefined;
};

/**
 * Where the template reads the keys it no longer offers: the saved values under the resolved ones, with
 * `vizGap` / `vizShape` only when saved (their defaults must not hide a saved legacy bar width or radius).
 */
function hiddenOf(s: ModuleSettings, saved: ModuleSettings | undefined): ModuleSettings {
  const out: ModuleSettings = { ...saved, ...s };
  for (const k of ["vizGap", "vizShape"]) {
    if (saved?.[k] === undefined) delete out[k];
    else out[k] = saved[k];
  }
  return out;
}

const NOW_PLAYING_SETTINGS: ModuleSetting[] = [
  PLAYER_LAYOUT,
  ...NOW_PLAYING_OWN,
  ...MEDIA_SETTINGS.filter((d) => !LEGACY_ONLY.includes(d.key)).map((d) => ({ ...d, ...TEMPLATE_GROUPS[d.key] })),
  ...vizShapeSettings(),
  boolSetting("vizPeaks", "Peak caps", false, { group: VIZ_SHAPE_GROUP }),
  ...vizColorSettings(colorSetting("vizRamp", "Visualizer color")),
  ...vizDynamicsSettings(),
];

export const GROUP_C: DashboardModule[] = [
  templateModule({
    meta: nowPlaying,
    Component: NowPlaying,
    settings: NOW_PLAYING_SETTINGS,
    // the visualiser's levels: read, not owned (the legacy media modules do the same)
    prefixes: ["plugins.audio-level-meter."],
    // vizMode / vizDevice are stored under the legacy keys waveformVariant / liveSource (PHASE9_PLAN §3.2);
    // the keys the template no longer offers (vizEngine, the old shape keys) are read from the saved values
    toProps: (s, saved) => {
      const hidden = hiddenOf(s, saved);
      const shared = sharedPropsOf(s, hidden);
      return {
      ...pick<NowPlayingProps>(["source", "showArt", "progress", "showTimeline"])(s),
      ...shared,
      vizLook: { ...shared.vizLook, peaks: boolOf(s.vizPeaks) },
      vizMode: vizStyleOf(hidden),
      // unset / Auto = "" (the loudest live device), as the legacy media modules; undefined would pin default-audio
      vizDevice: String(s.liveSource ?? ""),
      vizRamp: stringOf(s.vizRamp),
      };
    },
  }),
  templateModule({
    meta: audioMeter,
    Component: AudioMeter,
    settings: [
      deviceSetting("device", "Device", "audio", { group: "Audio meter" }),
      enumSetting("mode", "Mode", "single", [{ value: "single", label: "Single device" }, { value: "bridge", label: "Bridge (all devices)" }], { group: "Audio meter" }),
      enumSetting("meterStyle", "Meter style", "led", opts(METER_STYLES), { group: "Audio meter" }),
      numberSetting("segments", "Segments (0 = auto)", 0, { min: 0, max: 64, step: 1, group: "Audio meter" }),
      enumSetting("orientation", "Bridge layout", "vertical", [{ value: "vertical", label: "Columns" }, { value: "horizontal", label: "Rows" }], { group: "Audio meter", visibleIf: (v) => v.mode === "bridge" }),
      ...audioSettings("showDevice", "showDetails", "showVolume", "showMute", "meterBallistics", "levelColor", "hotColor"),
    ],
    toProps: (s) => ({
      ...pick<AudioMeterProps>(["showDevice", "showDetails", "showVolume", "showMute", "levelColor", "hotColor"])(s),
      device: stringOf(s.device),
      mode: oneOf(s.mode, ["single", "bridge"]),
      meterStyle: oneOf(s.meterStyle, METER_STYLES),
      segments: autoCount(s.segments),
      orientation: oneOf(s.orientation, ["vertical", "horizontal"]),
      ballistics: ballisticsOf(s),
    }),
  }),
  templateModule({
    meta: volumeMixer,
    Component: VolumeMixer,
    // a lone colour would be a one-setting category: it sits in Content with the toggles
    settings: [
      deviceSetting("device", "Device (Auto = all)", "audio", { group: "Volume mixer" }),
      ...audioSettings("showDevice", "showMute", "levelColor").map((d) => (d.key === "levelColor" ? { ...d, group: "Content" } : d)),
    ],
    // onSetVolume / onToggleMute are wired by the shell, not stored
    toProps: (s) => ({ ...pick<VolumeMixerProps>(["showDevice", "showMute", "levelColor"])(s), device: stringOf(s.device) }),
  }),
  templateModule({
    meta: meterBridge,
    Component: MeterBridge,
    settings: [
      deviceSetting("channels", "Channels (none = all devices)", "audio", { multiple: true, group: "Meter bridge" }),
      boolSetting("includeDefault", "Include the default device", false, { group: "Meter bridge" }),
      enumSetting("orientation", "Orientation", "vertical", [{ value: "vertical", label: "Columns" }, { value: "horizontal", label: "Rows" }], { group: "Meter bridge" }),
      enumSetting("ladder", "Ladder", "led", [{ value: "led", label: "LED" }, { value: "smooth", label: "Smooth" }], { group: "Meter bridge" }),
      numberSetting("segments", "Segments (0 = auto)", 0, { min: 0, max: 64, step: 1, group: "Meter bridge" }),
      boolSetting("showScale", "dB scale", true, { group: "Meter bridge" }),
      boolSetting("showVolume", "Volume", true, { group: "Meter bridge" }),
      numberSetting("holdMs", "Peak hold (ms)", 1500, { min: 0, max: 5000, step: 100, group: "Thresholds" }),
      numberSetting("floor", "Floor (dB)", -60, { min: -120, max: -20, step: 1, group: "Thresholds" }),
      numberSetting("warnDb", "Warn above (dB)", -18, { min: -60, max: 0, step: 1, group: "Thresholds" }),
      numberSetting("clipDb", "Clip above (dB)", -6, { min: -60, max: 0, step: 1, group: "Thresholds" }),
      ...audioSettings("showDevice", "showDetails", "showMute", "meterBallistics", "levelColor", "hotColor"),
    ],
    toProps: (s) => ({
      ...pick<MeterBridgeProps>(["includeDefault", "showScale", "showVolume", "showDetails", "showMute", "levelColor", "hotColor"])(s),
      channels: splitKeys(s.channels).length ? splitKeys(s.channels) : undefined,
      orientation: oneOf(s.orientation, ["vertical", "horizontal"]),
      ladder: oneOf(s.ladder, ["led", "smooth"]),
      segments: autoCount(s.segments),
      holdMs: numberOf(s.holdMs),
      floor: numberOf(s.floor),
      warnDb: numberOf(s.warnDb),
      clipDb: numberOf(s.clipDb),
      showName: s.showDevice as boolean,
      ballistics: ballisticsOf(s),
    }),
  }),
  templateModule({
    meta: visualizer,
    Component: Visualizer,
    settings: [
      enumSetting("mode", "Mode", "bars", opts(VIZ_MODES), { group: "Visualizer" }),
      deviceSetting("device", "Audio device", "audio", { group: "Visualizer" }),
      numberSetting("bands", "Bands (0 = auto)", 0, { min: 0, max: 64, step: 1, group: "Visualizer" }),
      numberSetting("sensitivity", "Sensitivity", 1.4, { min: 0.2, max: 4, step: 0.1, group: "Visualizer" }),
      boolSetting("peaks", "Peak caps", true, { group: "Visualizer" }),
      ...vizShapeSettings(),
      ...vizColorSettings(colorSetting("ramp", "Color")),
      ...vizDynamicsSettings(),
    ],
    toProps: (s) => ({
      ...pick<VisualizerProps>(["peaks"])(s),
      vizLook: vizLookOf(s),
      mode: oneOf(s.mode, VIZ_MODES),
      device: stringOf(s.device),
      bands: autoCount(s.bands),
      ramp: stringOf(s.ramp),
      sensitivity: numberOf(s.sensitivity),
    }),
  }),
  templateModule({ meta: waveLink, Component: WaveLink, settings: WAVELINK_SETTINGS, toProps: wavelinkToProps }),
];
