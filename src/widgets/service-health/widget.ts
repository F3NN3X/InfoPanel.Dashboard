// Service Health: the status of every data source. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { oneOf, viewSetting } from "../shared/settings-kit";
import type { ServiceHealthProps } from "./ServiceHealth";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: { card: true, dense: true } },
  /** The template's `layout` is stored as `healthLayout` (the standard `layout` keeps its meaning). */
  settings: [viewSetting(meta, { label: "Services as", group: "Services" })],
  render: {
    load: () => import("./ServiceHealth"),
    toProps: (s: ModuleSettings): Partial<ServiceHealthProps> => ({ layout: oneOf(s.healthLayout, ["list", "pills"]) }),
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
