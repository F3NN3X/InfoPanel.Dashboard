// Network Traffic: live download and upload. What the registry needs; the component is its own chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { networkThroughputIsland } from "../island/hardware";
import { colorSetting, deviceSetting, enumSetting, pass, rateUnitOf, rateUnitSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { NetworkThroughputProps } from "./NetworkThroughput";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it; the speed units.
  inspector: { header: "yes", compact: CARD, fmt: ["rateUnit"] },
  // The view and toggles keep the old Network widget's keys. The old `view` select (speeds / totals) only bundled the two
  // switches; a stored `view` is ignored.
  settings: [
    { key: "showTotals", label: "Session totals", type: "boolean", default: true, group: "Traffic" },
    { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false, group: "Traffic" },
    // The speeds follow the theme's Series 1 and 2 ("" = the widget's own colours).
    colorSetting("downloadColor", "Download", { role: "s1", more: false }),
    colorSetting("uploadColor", "Upload", { role: "s2", more: false }),
    rateUnitSetting(),
    deviceSetting("Adapter", "adapter", { group: "Adapter" }),
    enumSetting("chart", "Chart", "overlay", [{ value: "overlay", label: "Overlay" }, { value: "mirrored", label: "Mirrored" }], { group: "Traffic", visibleIf: (v) => Boolean(v.sparkline) }),
  ],
  island: networkThroughputIsland,
  render: {
    load: () => import("./NetworkThroughput"),
    toProps: (s: ModuleSettings): Partial<NetworkThroughputProps> => ({
      ...pass<Partial<NetworkThroughputProps>>("chart", "showTotals", "sparkline", "downloadColor", "uploadColor")(s),
      adapter: deviceOf(s, "adapter"),
      rateUnit: rateUnitOf(s.rateUnit),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
