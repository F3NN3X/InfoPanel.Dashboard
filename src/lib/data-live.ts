import { useEffect, useMemo, useReducer } from "react";
import { useSensors } from "@/hooks/useSensors";
import { subscribeApiBase } from "@/lib/data-api";
import { SampleHistory, recordThrottled } from "@/lib/sample-history";
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
  /** Bumps once per recorded sample, for views that redraw their sparkline. */
  tick: number;
}

/** Live values and 24-sample histories for every key; idle while `active` is false. */
export function useLiveData(active: boolean): LiveData {
  const values = useSensors(active ? null : []);
  const history = useMemo(() => new SampleHistory(), []);
  const [tick, bump] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!active) return;
    // The store ticks on every message of every namespace stream; sample once per interval.
    const offTick = sensorStore.subscribeTick(() => {
      if (recordThrottled(history, sensorStore.getValues(), Date.now())) bump();
    });
    // A new Data API URL wipes the store's values; the old server's samples go with them.
    const offBase = subscribeApiBase(() => {
      history.clear();
      bump();
    });
    return () => {
      offTick();
      offBase();
    };
  }, [active, history]);

  return { values, history, tick };
}
