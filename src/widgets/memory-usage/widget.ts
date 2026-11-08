// Memory: physical and virtual memory in use. What the registry needs; the component is its own chunk.
import { thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { thresholdSetting } from "../shared/settings-kit";
import type { MemoryUsageProps } from "./MemoryUsage";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card (the dense view falls back to it); the Load threshold.
  inspector: { header: "yes", compact: { card: true, dense: "fallback" }, thr: ["load"] },
  settings: [thresholdSetting("load")],
  render: {
    load: () => import("./MemoryUsage"),
    toProps: (s: ModuleSettings): Partial<MemoryUsageProps> => thresholdsOf(s, "load", ["warn", "crit"]),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 threshold keys; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
