import { useEffect, useRef, useState } from "react";
import type { SensorMap } from "@/modules/types";
import { bindingValue } from "./libre";
import type { IPSensorBinding } from "./types";

/**
 * Rolling sample queues for chart items (graph / bar / donut) — the web
 * counterpart of InfoPanel's 4096-sample SKBitmap queues. One queue per
 * sensor key, sampled from live snapshots.
 */
const MAX_SAMPLES = 2400;

const queues = new Map<string, number[]>();

/** Push a snapshot's values for the given bindings (call once per snapshot). */
export function sampleBindings(sensors: SensorMap, bindings: IPSensorBinding[]) {
  for (const b of bindings) {
    const v = bindingValue(sensors, b);
    if (v === undefined) continue;
    const key = bindingKey(b);
    const q = queues.get(key) ?? [];
    q.push(v);
    if (q.length > MAX_SAMPLES) q.splice(0, q.length - MAX_SAMPLES);
    queues.set(key, q);
  }
}

function bindingKey(b: IPSensorBinding): string {
  return (
    b.sensorType +
    ":" +
    (b.libreId ?? b.pluginId ?? JSON.stringify(b.hwinfo ?? "")) +
    ":" +
    (b.valueType ?? "NOW")
  );
}

/** The current queue (a stable reference that grows; consumers re-render on length). */
export function queueFor(b: IPSensorBinding): number[] {
  return queues.get(bindingKey(b)) ?? [];
}

/** React hook: re-renders whenever the queue for a binding grows. */
export function useIPQueue(b: IPSensorBinding): number[] {
  const q = queueFor(b);
  const [tick, setTick] = useState(0);
  const lenRef = useRef(q.length);
  useEffect(() => {
    if (q.length !== lenRef.current) {
      lenRef.current = q.length;
      setTick((t) => t + 1);
    }
  });
  return tick >= 0 ? q : q;
}
