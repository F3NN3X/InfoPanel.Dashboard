import { useSensorCatalog, type ApiSources } from "@/lib/catalog";
import { buildDataModel, type DataModel } from "@/lib/data-points";
import type { SensorMap } from "@/modules/types";

let last: { sources: ApiSources | null; sensors: SensorMap; model: DataModel } | null = null;

/** The model of a catalog, built once while it stays the same: every caller gets the same object, so every count agrees. */
export function modelOf(sources: ApiSources | null, sensors: SensorMap): DataModel {
  if (last && last.sources === sources && last.sensors === sensors) return last.model;
  const model = buildDataModel(sources, sensors);
  last = { sources, sensors, model };
  return model;
}

/** The one model of the Data API behind the Data view, the status popover and every sensor picker. */
export function useDataModel(): DataModel {
  const catalog = useSensorCatalog();
  return modelOf(catalog.sources, catalog.sensors);
}
