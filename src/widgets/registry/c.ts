// Template widgets, group C: media / audio (see _docs/redesign/phase9/brief-9.3c-templates.md).
import type { DashboardModule } from "@/modules/types";
import { templateModule } from "../module";
import { lazyWidget } from "../lazy-widget";
import { audioFlowSetting, audioSettings, flowOfSettings, mixerLookOf, mixerViewSettings, pickedDevicesOf, WAVELINK_SETTINGS, wavelinkToProps } from "../shared/audio-settings";
import { colorSetting, devicesSetting, pick, stringOf } from "../shared/settings-kit";
import type { VolumeMixerProps } from "../VolumeMixer";
import { meta as volumeMixer } from "../meta/VolumeMixer";
import { meta as waveLink } from "../meta/WaveLink";
import { waveLinkIsland } from "../island-sources";
import { volumeMixerIsland } from "../island/audio";

// Each component loads in its own chunk, the first time a zone draws it.
const VolumeMixer = lazyWidget(() => import("../VolumeMixer"));
const WaveLink = lazyWidget(() => import("../WaveLink"));

const DEVICE = "Device";

export const GROUP_C: DashboardModule[] = [
  templateModule({
    meta: volumeMixer,
    Component: VolumeMixer,
    settings: [
      ...audioSettings("showDevice", "showMute").map((d) => (d.key === "showMute" ? { ...d, label: "Show mute state" } : d)),
      // The level follows the theme's OK ("" = the accent).
      colorSetting("levelColor", "Level", { role: "ok", more: false }),
      devicesSetting("Devices (none = all)", "audio", { group: DEVICE }),
      audioFlowSetting(DEVICE),
      ...mixerViewSettings(volumeMixer, { orientationKey: "orientation" }),
    ],
    // read-only: the volume plugin has no write path
    toProps: (s) => ({ ...pick<VolumeMixerProps>(["showDevice", "showMute", "levelColor"])(s), devices: pickedDevicesOf(s, "devices"), flow: flowOfSettings(s), mixerLook: mixerLookOf(s, "orientation") }),
    island: volumeMixerIsland,
  }),
  templateModule({
    meta: waveLink,
    Component: WaveLink,
    settings: WAVELINK_SETTINGS,
    island: waveLinkIsland,
    toProps: (s) => ({ ...wavelinkToProps(s), levelColor: stringOf(s.levelColor) }),
  }),
];
