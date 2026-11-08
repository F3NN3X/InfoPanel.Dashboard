// Fans: fan speeds and duty. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting, numberOf, numberSetting } from "../shared/settings-kit";
import type { FansProps } from "./Fans";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    boolSetting("spin", "Spin the fan icons", true, { group: "Dynamics", tab: "behaviour" }),
    numberSetting("maxRpm", "Full-scale speed (RPM)", 3000, { min: 500, max: 6000, step: 100, group: "Bar scale", tab: "data" }),
  ],
  render: {
    load: () => import("./Fans"),
    toProps: (s: ModuleSettings): Partial<FansProps> => ({ maxRpm: numberOf(s.maxRpm), spin: boolOf(s.spin) }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
