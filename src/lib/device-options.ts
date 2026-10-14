import { audioIds, deviceLabel } from "@/widgets/audio-data";
import { detect, diskName, hw, pretty } from "@/widgets/core/data";
import type { DeviceKind, SensorMap } from "@/modules/types";

export interface DeviceOption {
  value: string;
  label: string;
}

const DRIVE_NAME = /^plugins\.drive-info-plugin\.([^.]+)\.name$/;

const text = (sensors: SensorMap, key: string): string => {
  const s = sensors[key];
  return s?.text ?? (s?.value !== undefined ? String(s.value) : "");
};

/**
 * The devices of one kind found in the live keys, "" (Auto) first. Values are the ids the widgets
 * match on (hardware slug, level-meter container, drive letter); a label is the sensor's display
 * name when it has one, else the id made readable.
 */
export function deviceOptions(kind: DeviceKind, sensors: SensorMap): DeviceOption[] {
  // `hw()` and `detect()` read keys only
  const data = Object.fromEntries(Object.keys(sensors).map((k) => [k, ""]));
  const auto: DeviceOption = { value: "", label: "Auto" };
  const slugs = (ids: (string | undefined)[]): DeviceOption[] =>
    ids.flatMap((id) => (id ? [{ value: id, label: pretty(id) }] : []));
  switch (kind) {
    case "cpu":
      return [auto, ...slugs(detect(data, /^libre\.(.+)_cpu_total$/))];
    case "gpu":
      return [auto, ...slugs(detect(data, /^libre\.(.+)_gpu_core_load$/))];
    case "disk":
      // the drive's volumes first ("C: Windows · Kingston SFYRD2000G"), so a drive is picked by its letter
      return [
        auto,
        ...hw(data).disks.map((id) => {
          const volumes = sensors[`libre.${id}_volumes`]?.text;
          return { value: id, label: volumes ? `${volumes} · ${diskName(id)}` : diskName(id) };
        }),
      ];
    case "adapter":
      return [auto, ...slugs(hw(data).adapters)];
    case "audio":
      return [
        auto,
        ...audioIds(data).map((id) => ({
          value: id,
          label: deviceLabel(id, text(sensors, `plugins.audio-level-meter.${id}.device-name`)) || id,
        })),
      ];
    case "drive": {
      const ids = [...new Set(Object.keys(sensors).map((k) => k.match(DRIVE_NAME)?.[1]).filter((id): id is string => !!id))];
      return [
        auto,
        ...ids.map((id) => ({ value: id, label: text(sensors, `plugins.drive-info-plugin.${id}.name`) || id.toUpperCase() })),
      ];
    }
  }
}
