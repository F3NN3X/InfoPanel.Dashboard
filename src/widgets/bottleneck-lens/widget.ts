// Bottleneck Lens: one verdict for what holds a game back. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { numberOf, numberSetting } from "../shared/settings-kit";
import type { BottleneckLensProps } from "./BottleneckLens";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it.
  inspector: { header: "yes", compact: CARD },
  settings: [
    numberSetting("hold", "Hold a verdict (s)", 5, { min: 1, max: 30, step: 1, group: "Verdict", tab: "behaviour", hint: "A new verdict must last this long before it replaces the one shown" }),
    numberSetting("gpuAt", "GPU-bound at (%)", 93, { min: 50, max: 100, step: 1, group: "Limits", tab: "behaviour" }),
    numberSetting("cpuAt", "CPU-bound at (%)", 85, { min: 50, max: 100, step: 1, group: "Limits", tab: "behaviour", hint: "The busiest core" }),
    numberSetting("vramAt", "VRAM full at (%)", 95, { min: 50, max: 100, step: 1, group: "Limits", tab: "behaviour" }),
  ],
  render: {
    load: () => import("./BottleneckLens"),
    toProps: (s: ModuleSettings): Partial<BottleneckLensProps> => ({ hold: numberOf(s.hold), gpuAt: numberOf(s.gpuAt), cpuAt: numberOf(s.cpuAt), vramAt: numberOf(s.vramAt) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
