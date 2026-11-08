// Uptime: the time since boot. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { boolOf, boolSetting } from "../shared/settings-kit";
import type { UptimeProps } from "./Uptime";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card (the dense view falls back to it). Its one reading is the plugin's uptime: nothing to pick or bind.
  inspector: { header: "yes", compact: CARD, noData: true },
  settings: [boolSetting("showSeconds", "Seconds", true, { group: "Time" })],
  render: {
    load: () => import("./Uptime"),
    toProps: (s: ModuleSettings): Partial<UptimeProps> => ({ showSeconds: boolOf(s.showSeconds) }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
