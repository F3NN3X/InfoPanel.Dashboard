// System Overview: CPU, GPU, memory, drives and network in one panel, as graphs or as gauges. What the registry needs;
// the component is its own chunk.
import { DENSE, defineWidget } from "../define";
import { SYSTEM_OVERVIEW_SETTINGS, systemOverviewProps } from "../shared/system-overview";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // The title only, a dense view of its own; the temperature unit and decimals, the Load, Temperature and Fullness thresholds.
  inspector: { header: "title-only", compact: DENSE, fmt: ["tempUnit", "decimals"], thr: ["load", "temp", "full"] },
  // Its rows and props live in shared/system-overview.ts.
  settings: SYSTEM_OVERVIEW_SETTINGS,
  render: { load: () => import("./SystemOverview"), toProps: systemOverviewProps },
  // Migrations and sample stay central (the default): settings-migrate.ts has its v7 thresholds and units and the v8
  // section colour roles; the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
