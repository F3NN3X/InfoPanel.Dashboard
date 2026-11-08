// System Status: CPU, RAM and Data API health. What the registry needs; the component is its own chunk.
import { thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { thresholdSetting } from "../shared/settings-kit";
import type { SystemStatusProps } from "./SystemStatus";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card (the dense view falls back to it); the Load threshold.
  inspector: { header: "yes", compact: CARD, thr: ["load"] },
  settings: [thresholdSetting("load")],
  render: {
    load: () => import("./SystemStatus"),
    toProps: (s: ModuleSettings): Partial<SystemStatusProps> => thresholdsOf(s, "load", ["warn", "crit"]),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 threshold keys; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
