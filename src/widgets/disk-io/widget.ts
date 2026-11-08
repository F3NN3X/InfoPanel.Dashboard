// Disk I/O: each drive's read and write rate, with a combined history. What the registry needs; the component is its
// own chunk.
import { deviceOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting, colorSetting, deviceSetting, pass } from "../shared/settings-kit";
import type { DiskIOProps } from "./DiskIO";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    boolSetting("showHistory", "Combined history", true, { group: "Chart" }),
    // Read and write follow the theme's Series 1 and 2 ("" = the widget's own colours).
    colorSetting("readColor", "Read", { role: "s1", more: false }),
    colorSetting("writeColor", "Write", { role: "s2", more: false }),
    deviceSetting("Disk", "disk", { group: "Disk", hint: "Auto = every detected drive" }),
  ],
  render: {
    load: () => import("./DiskIO"),
    toProps: (s: ModuleSettings): Partial<DiskIOProps> => ({ ...pass<Partial<DiskIOProps>>("readColor", "writeColor")(s), disk: deviceOf(s, "disk"), showHistory: boolOf(s.showHistory) }),
  },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 device key `disk` and the v8 colour
  // roles; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
