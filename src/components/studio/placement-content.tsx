import type { ReactNode } from "react";
import { GenericCard } from "@/modules/fallback";
import { modules } from "@/modules";
import type { SensorMap } from "@/modules/types";
import type { SensorValue } from "@/hooks/useSensors";
import { CARDS_ID, type Placement } from "@/lib/layout";

const moduleById = new Map(modules.map((m) => [m.id, m]));

export interface PlacementRender {
  content: ReactNode;
  hasData: boolean;
  title: string;
}

/**
 * Render the content of a placement (module or the "cards" catch-all grid).
 * Shared by the kiosk grid and the studio canvas.
 */
export function placementContent(
  p: Placement,
  sensors: SensorMap,
  unclaimed: Array<[string, SensorValue]>
): PlacementRender {
  if (p.module === CARDS_ID) {
    if (unclaimed.length === 0)
      return { content: null, hasData: false, title: "Other sensors" };
    const subCols = p.colSpan >= 8 ? 4 : p.colSpan >= 4 ? 3 : 2;
    return {
      hasData: true,
      title: "Other sensors",
      content: (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${subCols}, minmax(0, 1fr))` }}
        >
          {unclaimed.map(([key, sensor]) => (
            <GenericCard key={key} sensorKey={key} sensor={sensor} />
          ))}
        </div>
      ),
    };
  }
  const mod = moduleById.get(p.module);
  if (!mod) return { content: null, hasData: false, title: p.module };
  const content = mod.render(sensors);
  return {
    content: content ?? null,
    hasData: content != null,
    title: mod.title,
  };
}
