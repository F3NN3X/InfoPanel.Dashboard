import { useEffect, useReducer } from "react";
import { useSensors } from "@/hooks/useSensors";
import { subscribeApiBase } from "@/lib/data-api";
import { HistoryRecorder } from "@/lib/data-history";
import { sensorStore } from "@/lib/sensor-store";
import type { SensorMap } from "@/modules/types";

/**
 * Live values for the Data Explorer. It reads the page's one sensor store:
 * while mounted, `useSensors(null)` keeps "every sensor" retained, which
 * the store serves from its namespace streams (or folds to the single
 * unfiltered `/events` stream) — never one stream per row.
 */

/** Hidden for longer than this, the samples have a hole in them: start over on return. */
const STALE_AFTER_MS = 5000;

/** One recorder, shared by the views that watch keys; leaving the Data view releases every key it watched. */
const recorder = new HistoryRecorder();

export interface LiveData {
  values: SensorMap;
  recorder: HistoryRecorder;
  /** Bumps once per recorded sample, for views that redraw their charts. */
  tick: number;
}

/**
 * Live values, and the last minute of the `watched` keys (the rows in view and the selected point).
 * Nothing is sampled while the page is hidden.
 */
export function useLiveData(watched: readonly string[]): LiveData {
  const values = useSensors(null);
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const list = watched.join("\n");

  useEffect(() => {
    recorder.watch(list === "" ? [] : list.split("\n"), sensorStore.getValues(), Date.now());
    bump();
  }, [list]);

  useEffect(() => () => recorder.watch([], {}, 0), []);

  useEffect(() => {
    let off: (() => void) | null = null;
    let hiddenAt = 0;
    // The store ticks on every message of every namespace stream; sample once per interval.
    const start = () => {
      off = sensorStore.subscribeTick(() => {
        if (recorder.sample(sensorStore.getValues(), Date.now())) bump();
      });
    };
    const onVisibility = () => {
      off?.();
      off = null;
      if (document.hidden) {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt && Date.now() - hiddenAt > STALE_AFTER_MS) recorder.restart(sensorStore.getValues(), Date.now());
      start();
      bump();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    // A new Data API URL wipes the store's values; the old server's samples go with them.
    const offBase = subscribeApiBase(() => {
      recorder.restart({}, Date.now());
      bump();
    });
    return () => {
      off?.();
      document.removeEventListener("visibilitychange", onVisibility);
      offBase();
    };
  }, []);

  return { values, recorder, tick };
}
