// Template widgets, group C: media / audio (see docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule, ModuleSetting, ModuleSettings } from "@/modules/types";
import { templateModule } from "../module";
import AudioMeter, { meta as audioMeter, type AudioMeterProps } from "../AudioMeter";
import MeterBridge, { meta as meterBridge, type MeterBridgeProps } from "../MeterBridge";
import NowPlaying, { meta as nowPlaying, type NowPlayingProps } from "../NowPlaying";
import { MEDIA_SETTINGS, PLAYER_LAYOUT, VIZ_ENGINE, sharedPropsOf } from "../NowPlaying/settings";
import Visualizer, { meta as visualizer, type VisualizerProps } from "../Visualizer";
import VolumeMixer, { meta as volumeMixer, type VolumeMixerProps } from "../VolumeMixer";
import WaveLink, { meta as waveLink } from "../WaveLink";

/** The stored settings whose key is one of the widget's prop names, passed straight through. */
const pick =
  <P extends object>(keys: readonly (keyof P & string)[]) =>
  (s: ModuleSettings): P =>
    Object.fromEntries(keys.filter((k) => s[k] !== undefined).map((k) => [k, s[k]])) as P;

/** The legacy media keys a new NowPlaying zone can use; the engine-picking and mapped keys stay with the legacy modules. */
const LEGACY_ONLY = ["waveform", "visualizer", "waveformVariant", "visualizerMirrored", "liveSource"];
const NOW_PLAYING_SETTINGS: ModuleSetting[] = [
  PLAYER_LAYOUT,
  VIZ_ENGINE,
  // the template draws untinted unless asked
  ...MEDIA_SETTINGS.filter((d) => !LEGACY_ONLY.includes(d.key)).map((d) => (d.key === "tint" ? { ...d, default: false } : d)),
];

export const GROUP_C: DashboardModule[] = [
  templateModule({
    meta: nowPlaying,
    Component: NowPlaying,
    settings: NOW_PLAYING_SETTINGS,
    // vizMode / vizDevice are stored under the legacy keys waveformVariant / liveSource (PHASE9_PLAN §3.2)
    toProps: (s) => {
      const own = pick<NowPlayingProps>(["source", "showArt", "progress", "vizMode", "vizDevice", "vizRamp", "showTimeline", "vizEngine"])(s);
      return { ...own, ...sharedPropsOf(s), vizMode: (s.waveformVariant ?? own.vizMode) as NowPlayingProps["vizMode"], vizDevice: s.liveSource === undefined ? own.vizDevice : String(s.liveSource) };
    },
  }),
  templateModule({
    meta: audioMeter,
    Component: AudioMeter,
    settings: [],
    toProps: pick<AudioMeterProps>(["device", "mode", "segments", "meterStyle"]),
  }),
  templateModule({
    meta: volumeMixer,
    Component: VolumeMixer,
    settings: [],
    toProps: pick<VolumeMixerProps>([]),
  }),
  templateModule({
    meta: meterBridge,
    Component: MeterBridge,
    settings: [],
    toProps: pick<MeterBridgeProps>(["channels", "orientation", "floor", "segments", "holdMs", "warnDb", "clipDb", "showScale", "showVolume", "ladder"]),
  }),
  templateModule({
    meta: visualizer,
    Component: Visualizer,
    settings: [],
    toProps: pick<VisualizerProps>(["mode", "device", "bands", "ramp", "sensitivity", "peaks"]),
  }),
  templateModule({ meta: waveLink, Component: WaveLink, settings: [], toProps: () => ({}) }),
];
