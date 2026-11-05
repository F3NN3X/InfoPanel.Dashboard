import { useMemo } from "react";
import type { DataModel } from "@/lib/data-points";
import { useDataModel } from "@/lib/use-data-model";
import { computeUsage, type UsageIndex } from "@/lib/data-usage";
import type { ProfileView } from "@/lib/layout";
import { modules } from "@/modules";

/** The Data API's points and which zones of the profile read them (the header's count, Bound data). */
export function useZoneData(profile: ProfileView): { model: DataModel; usage: UsageIndex } {
  const model = useDataModel();
  const usage = useMemo(
    () => computeUsage(profile, model.points.map((p) => p.key), modules),
    [profile, model]
  );
  return { model, usage };
}
