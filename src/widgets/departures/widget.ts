// Departures: the next departures from a stop. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting } from "../shared/settings-kit";
import type { DeparturesProps } from "./Departures";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [boolSetting("showStatus", "Status line", true, { group: "Status line" })],
  render: {
    load: () => import("./Departures"),
    toProps: (s: ModuleSettings): Partial<DeparturesProps> => ({ showStatus: boolOf(s.showStatus) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
