import { useEffect, useMemo, useSyncExternalStore } from "react";
import { sensorStore } from "@/lib/sensor-store";
import { touches } from "@/lib/sensor-stream";
import type { SensorMap } from "@/modules/types";

export interface SensorValue {
  value?: number;
  text?: string;
  unit: string;
  min?: number;
  max?: number;
  avg?: number;
  /** Human-readable display name (e.g. "CPU Package Temp") */
  name?: string;
  source?: string;
}

/**
 * The live sensor map, re-rendering only when a key under one of
 * `prefixes` changes (`null` = any key, and every stream). Mounting it keeps
 * those namespaces' streams open. The map holds every streamed key, so
 * callers read it exactly as before.
 */
export function useSensors(prefixes: readonly string[] | null): SensorMap {
  const signature = prefixes === null ? "*" : prefixes.join("\n");
  const view = useMemo(() => {
    const list = prefixes === null ? null : signature === "" ? [] : signature.split("\n");
    let snapshot = sensorStore.getValues();
    return {
      subscribe(onChange: () => void) {
        const release = list && list.length === 0 ? () => {} : sensorStore.retain(list);
        const unsubscribe = sensorStore.subscribe((changed) => {
          if (!touches(changed, list)) return;
          snapshot = sensorStore.getValues();
          onChange();
        });
        // Catch up on anything that arrived before this subscription.
        snapshot = sensorStore.getValues();
        return () => {
          unsubscribe();
          release();
        };
      },
      getSnapshot: () => snapshot,
    };
    // `signature` captures `prefixes` by value.
  }, [signature]);
  // The server snapshot is the same map (a static render, e.g. a test, reads the current values).
  return useSyncExternalStore(view.subscribe, view.getSnapshot, view.getSnapshot);
}

/** Timestamp of the last sensor message (0 before the first). */
export function useSensorsTimestamp(): number {
  return useSyncExternalStore(sensorStore.subscribeTick, sensorStore.getTimestamp);
}

/** Whether every open sensor stream is connected. */
export function useSensorsConnected(): boolean {
  return useSyncExternalStore(sensorStore.subscribeStatus, sensorStore.isConnected);
}

/**
 * Keeps a fast (100 ms) stream open for `prefix` while mounted (`null` = none): the audio widgets'
 * levels and spectrum. The values reach `useSensors` readers through the same map.
 */
export function useFastSensors(prefix: string | null): void {
  useEffect(() => (prefix ? sensorStore.retainFast(prefix) : undefined), [prefix]);
}
