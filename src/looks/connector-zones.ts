// The zones a pack's connectors may join (D20): real widget zones only. The InfoPanel items layer, a canvas and any node that
// spans the whole grid are page surfaces, not widgets: as the hub they would draw every spoke from the page edge.
import { CANVAS_ID, type Placement } from "@/lib/layout";
import { isItemsLayer } from "@/lib/page-model/items-layer";
import type { ZoneSize } from "./pack";

export function connectorZones(placements: readonly Placement[], grid: { cols: number; rows: number }): ZoneSize[] {
  return placements
    .filter((p) => p.visible && p.module !== CANVAS_ID && !isItemsLayer(p) && !(p.colSpan >= grid.cols && p.rowSpan >= grid.rows))
    .map((p) => ({ id: p.id, colSpan: p.colSpan, rowSpan: p.rowSpan }));
}
