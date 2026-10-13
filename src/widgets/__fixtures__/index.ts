import type { SensorMap } from "@/modules/types";
import extra from "./extra.json";
import snapshot from "./snapshot.json";

/** The captured sensor snapshot plus synthetic values for sources the capture machine lacks (extra wins). */
export function fixtureSensors(): SensorMap {
  return { ...(snapshot.sensors as SensorMap), ...(extra.sensors as SensorMap) };
}
