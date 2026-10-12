import { findEntry, liveText } from "@/lib/sensors";
import { templateModule } from "@/widgets/module";
import { departuresOptions, DEPARTURES_SETTINGS } from "@/widgets/registry/e";
import { CARD_SETTINGS } from "./standard-settings";

const P = "plugins.InfoPanel.VBZ.";

/**
 * VBZ module: the `Departures` template under the legacy id (card surface "Theme" by default).
 * Departure rows come from the flat dep_N_line / dep_N_dest / dep_N_time entries.
 */
export const vbzModule = templateModule({
  ...departuresOptions,
  alias: {
    id: "vbz",
    title: "Departures",
    minCols: 2,
    minRows: 1,
    prefixes: [P],
    settings: [...DEPARTURES_SETTINGS, ...CARD_SETTINGS],
    // No station and no departure rows: no section.
    hidden: (sensors) =>
      !liveText(findEntry(sensors, P, "station_name")?.sensor) &&
      !Object.keys(sensors).some((k) => k.startsWith(P) && /^dep_\d+_(line|dest|time)$/.test(k.slice(P.length)) && liveText(sensors[k])),
  },
});
