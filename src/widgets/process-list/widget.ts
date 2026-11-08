// Processes: the top processes by CPU or memory. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { enumSetting, numberOf, numberSetting, oneOf, optionPairs as opts } from "../shared/settings-kit";
import type { ProcessListProps } from "./ProcessList";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    numberSetting("rows", "Rows (0 = fit the height)", 0, { min: 0, max: 30, step: 1, group: "Rows" }),
    enumSetting("sort", "Sort by", "cpu", opts(["cpu", "CPU"], ["utility", "CPU utility"], ["memory", "Memory"]), { group: "Sorting", tab: "behaviour" }),
  ],
  render: {
    load: () => import("./ProcessList"),
    toProps: (s: ModuleSettings): Partial<ProcessListProps> => ({ sort: oneOf(s.sort, ["cpu", "utility", "memory"]), rows: numberOf(s.rows) || undefined }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
