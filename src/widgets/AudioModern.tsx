// The legacy `audiomodern` widget on the shell: its `view` setting picks the template that draws it.
import type { ModuleSettings } from "@/modules/types";
import AudioMeter, { type AudioMeterProps } from "./AudioMeter";
import MeterBridge, { type MeterBridgeProps } from "./MeterBridge";
import VolumeMixer, { type VolumeMixerProps } from "./VolumeMixer";
import type { BallisticsPreset, ShellProps, WidgetMeta } from "./kit";

export const meta: WidgetMeta = {
  id: "audiomodern",
  name: "Audio (modern)",
  category: "Audio",
  icon: "graphic_eq",
  prefixes: ["plugins.audio-level-meter."],
  defaultSize: [2, 1],
  minSize: [2, 1],
  description: "Audio devices and levels",
};

export interface AudioModernProps extends ShellProps {
  look?: ModuleSettings;
  view?: "meter" | "audiometer" | "volume";
  /** A level-meter container id; "" = all devices. */
  source?: string;
  showDevice?: boolean;
  showDetails?: boolean;
  showVolume?: boolean;
  showMute?: boolean;
  meterVariant?: "solid" | "segmented" | "gradient";
  meterOrientation?: "horizontal" | "vertical";
  meterBallistics?: BallisticsPreset;
  levelColor?: string;
  hotColor?: string;
}

/** `view=meter`: one device → AudioMeter; all devices → its bridge, a row per device when horizontal. */
export const audioMeterProps = (p: AudioModernProps): Partial<AudioMeterProps> => ({
  device: p.source || undefined,
  mode: p.source ? "single" : "bridge",
  meterStyle: p.meterVariant === "segmented" ? "led" : p.meterVariant === "gradient" ? "bar" : "solid",
  orientation: p.meterOrientation === "vertical" ? "vertical" : "horizontal",
  ballistics: p.meterBallistics,
});

/** `view=audiometer`: MeterBridge; the details line (volume, L/R dB) is its volume bar and readouts. */
export const meterBridgeProps = (p: AudioModernProps): Partial<MeterBridgeProps> => ({
  channels: p.source ? [p.source] : undefined,
  includeDefault: true,
  orientation: p.meterOrientation === "vertical" ? "vertical" : "horizontal",
  ladder: p.meterVariant === "segmented" ? "led" : "smooth",
  showName: p.showDevice,
  showDetails: p.showDetails,
  showMute: p.showMute,
  showVolume: Boolean(p.showVolume || p.showDetails),
  ballistics: p.meterBallistics,
  levelColor: p.levelColor,
  hotColor: p.hotColor,
});

/** `view=volume`: VolumeMixer, one device when a source is chosen. */
export const volumeMixerProps = (p: AudioModernProps): Partial<VolumeMixerProps> => ({
  device: p.source || undefined,
  showDevice: p.showDevice,
  showMute: p.showMute,
  levelColor: p.levelColor,
});

// The legacy-named props that mean the same on the target (showDevice, showMute, …) pass through in `p`.
export default function AudioModern(p: AudioModernProps) {
  if (p.view === "volume") return <VolumeMixer {...p} {...volumeMixerProps(p)} />;
  if (p.view === "audiometer") return <MeterBridge {...p} {...meterBridgeProps(p)} />;
  return <AudioMeter {...p} {...audioMeterProps(p)} />;
}
