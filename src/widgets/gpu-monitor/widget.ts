// GPU Monitor: load, temperature, power, VRAM, clocks and fans of one graphics card. What the registry needs; the
// component is its own chunk.
import { deviceOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { deviceSetting, thresholdSetting } from "../shared/settings-kit";
import type { GpuMonitorProps } from "./GpuMonitor";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card; the Temperature threshold.
  inspector: { header: "yes", compact: CARD, thr: ["temp"] },
  settings: [deviceSetting("Graphics card", "gpu", { group: "Graphics card" }), thresholdSetting("temp")],
  render: {
    load: () => import("./GpuMonitor"),
    toProps: (s: ModuleSettings): Partial<GpuMonitorProps> => {
      const { warn, crit } = thresholdsOf(s, "temp", ["warnTemp", "critTemp"]);
      return { gpu: deviceOf(s, "gpu"), warnTemp: warn, critTemp: crit };
    },
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 Temperature levels and device key
  // `gpu`; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
