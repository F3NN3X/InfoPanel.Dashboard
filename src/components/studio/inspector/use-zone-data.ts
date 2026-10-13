import { useMemo } from "react";
import { useSensorCatalog } from "@/lib/catalog";
import { buildDataModel, type DataModel } from "@/lib/data-points";
import { computeUsage, type UsageIndex } from "@/lib/data-usage";
import type { ProfileView } from "@/lib/layout";
import { modules } from "@/modules";

/** The Data API's points and which zones of the profile read them (the header's count, Bound data). */
export function useZoneData(profile: ProfileView): { model: DataModel; usage: UsageIndex } {
  const catalog = useSensorCatalog();
  const model = useMemo(() => buildDataModel(catalog.sources, catalog.sensors), [catalog.sources, catalog.sensors]);
  const usage = useMemo(
    () => computeUsage(profile, model.points.map((p) => p.key), modules),
    [profile, model]
  );
  return { model, usage };
}
