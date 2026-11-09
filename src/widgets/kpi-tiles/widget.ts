// KPI Tiles: the four numbers you check first, with trends, and the Vitals cards as one of its views. What the registry
// needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { enumSetting, listPick, numberOf, numberSetting, optionPairs as opts, viewOnly, viewSetting } from "../shared/settings-kit";
import type { KpiTilesWidgetProps } from "./KpiTiles";
import { meta } from "./meta";

const KPI_METRICS = ["cpu", "gpu", "ram", "net", "vram", "power"] as const;
/** The cards view's metrics (the Vitals widget's): FPS where the tiles offer Power. */
const CARD_METRICS = ["cpu", "gpu", "ram", "net", "vram", "fps"] as const;
const tilesOnly = viewOnly(meta, "tiles");
const cardsOnly = viewOnly(meta, "cards");

export default defineWidget({
  meta,
  // No header; a summary card and a dense view of its own, in both views.
  inspector: { header: "none", compact: BOTH },
  settings: [
    viewSetting(meta, { group: "Display" }),
    tilesOnly(enumSetting("metrics", "Tiles", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "Memory"], ["net", "Network"], ["vram", "VRAM"], ["power", "Power"]), { multiple: true, group: "Tiles" })),
    tilesOnly(numberSetting("lookback", "Change over (readings)", 10, { min: 2, max: 60, step: 1, group: "History", tab: "behaviour" })),
    // A row of its own, so each view offers only the metrics it draws (the Vitals widget's `metrics`, config v19).
    cardsOnly(enumSetting("cardMetrics", "Metrics", "cpu,gpu,ram,net", opts(["cpu", "CPU"], ["gpu", "GPU"], ["ram", "RAM"], ["net", "Network"], ["vram", "VRAM"], ["fps", "FPS"]), { multiple: true, group: "Metrics" })),
  ],
  render: {
    load: () => import("./KpiTiles"),
    toProps: (s: ModuleSettings): Partial<KpiTilesWidgetProps> =>
      s.view === "cards" ? { view: "cards", metrics: listPick(s.cardMetrics, CARD_METRICS) } : { metrics: listPick(s.metrics, KPI_METRICS), lookback: numberOf(s.lookback) },
  },
  // Migrations and sample stay central (the default): config v19 (settings-migrate.v19.ts) made every Vitals placement
  // this widget's cards view (its `metrics` as `cardMetrics`); the sample is src/widgets/__fixtures__/snapshot.json, with
  // no widget-qa demo settings.
});
