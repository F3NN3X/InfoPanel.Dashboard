// Power Draw: CPU and GPU watts with history. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { numberOf, numberSetting } from "../shared/settings-kit";
import type { PowerDrawProps } from "./PowerDraw";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card (the dense view falls back to it).
  inspector: { header: "yes", compact: { card: true, dense: "fallback" } },
  settings: [numberSetting("budget", "Power budget (W)", 750, { min: 100, max: 2000, step: 50, group: "Budget" })],
  render: {
    load: () => import("./PowerDraw"),
    toProps: (s: ModuleSettings): Partial<PowerDrawProps> => ({ budget: numberOf(s.budget) }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
