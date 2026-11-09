// KPI Tiles' catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "KpiTiles",
  name: "KPI Tiles",
  category: "System",
  icon: "query_stats",
  prefixes: [],
  defaultSize: [6, 1],
  minSize: [1, 1],
  blurb: "Four key numbers with trends",
  tags: "kpi sparkline trend",
  description: "The four numbers you check first: value, change since ~10 readings ago, then a trend sparkline with a live end dot.",
  views: [
    { id: "tiles", name: "Tiles" },
    // The Vitals widget until config v19: added at its size and found by its words.
    { id: "cards", name: "Vitals", blurb: "CPU, GPU, RAM and network side by side", tags: "cpu gpu ram network vitals cards", defaultSize: [4, 1] },
  ],
};
