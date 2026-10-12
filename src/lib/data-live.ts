import { useEffect, useMemo, useReducer } from "react";
import { useSensors } from "@/hooks/useSensors";
import { SampleHistory, recordSnapshot } from "@/lib/sample-history";
import { sensorStore } from "@/lib/sensor-store";
import type { SensorMap } from "@/modules/types";

/**
 * Live values for the Data Explorer. It reads the page's one sensor store:
 * while `active`, `useSensors(null)` keeps "every sensor" retained, which
 * the store serves from its namespace streams (or folds to the single
 * unfiltered `/events` stream) — never one stream per row.
 */

export interface LiveData {
  values: SensorMap;
  history: SampleHistory;
  /** Bumps once per new sensor message, for views that redraw their sparkline. */
  tick: number;
}

/** Live values and 24-sample histories for every key; idle while `active` is false. */
export function useLiveData(active: boolean): LiveData {
  const values = useSensors(active ? null : []);
  const history = useMemo(() => new SampleHistory(), []);
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!active) return;
    let last = 0;
    return sensorStore.subscribeTick(() => {
      const stamp = sensorStore.getTimestamp();
      if (stamp === last) return;
      last = stamp;
      recordSnapshot(history, sensorStore.getValues());
      bump();
    });
  }, [active, history]);

  return { values, history, tick };
}
