import { useMemo } from "react";
import { toFlat, toNames } from "@/widgets/data-adapter";
import { sensorLabel } from "@/widgets/kit";
import { shellProps, useZoneLook } from "@/widgets/module";
import SensorValue from "@/widgets/SensorValue";
import type { SensorValue as Sensor } from "@/hooks/useSensors";
import { CARD_SETTINGS } from "./standard-settings";
import type { ModuleSettings } from "./types";

/**
 * The "Other sensors" zone: every sensor no module claimed, one `SensorValue` template each, so
 * skins and variants apply. New plugins without a module render here automatically; image URLs
 * show as images, multi-line values line by line. One look for every card (the zone's
 * `CARD_SETTINGS`; unset = the theme surface).
 */
export function OtherSensors({ unclaimed, settings, subCols }: { unclaimed: Array<[string, Sensor]>; settings: ModuleSettings; subCols: number }) {
  const look = useZoneLook(CARD_SETTINGS, settings, "theme");
  const map = useMemo(() => Object.fromEntries(unclaimed), [unclaimed]);
  const data = useMemo(() => toFlat(map), [map]);
  const names = useMemo(() => toNames(map), [map]);
  return (
    <div className="grid h-full w-full auto-rows-fr gap-3" style={{ gridTemplateColumns: `repeat(${subCols}, minmax(0, 1fr))` }}>
      {unclaimed.map(([key]) => (
        <SensorValue key={key} data={data} names={names} sensor={key} label={sensorLabel(key, names, key)} {...shellProps(look)} look={look} />
      ))}
    </div>
  );
}
