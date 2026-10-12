import type { SensorMap } from "@/modules/types";

/** Samples kept per key (the inspector's sparkline). */
export const HISTORY_SIZE = 24;

export interface HistoryStats {
  min: number;
  avg: number;
  max: number;
}

/**
 * Fixed-size ring buffers of numeric readings, one per sensor key. Mutable
 * on purpose: it takes a push per key per second for every numeric key.
 */
export class SampleHistory {
  private readonly buffers = new Map<string, { samples: number[]; next: number; count: number }>();

  constructor(private readonly size: number = HISTORY_SIZE) {}

  push(key: string, value: number): void {
    let buf = this.buffers.get(key);
    if (!buf) {
      buf = { samples: new Array<number>(this.size).fill(0), next: 0, count: 0 };
      this.buffers.set(key, buf);
    }
    buf.samples[buf.next] = value;
    buf.next = (buf.next + 1) % this.size;
    buf.count = Math.min(buf.count + 1, this.size);
  }

  /** The key's samples, oldest first. */
  get(key: string): number[] {
    const buf = this.buffers.get(key);
    if (!buf) return [];
    const start = buf.count < this.size ? 0 : buf.next;
    return Array.from({ length: buf.count }, (_, i) => buf.samples[(start + i) % this.size]);
  }

  /** Min / average / max over the kept samples, or null before the first. */
  stats(key: string): HistoryStats | null {
    const samples = this.get(key);
    if (samples.length === 0) return null;
    return {
      min: Math.min(...samples),
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
      max: Math.max(...samples),
    };
  }

  /** Forget everything (the Data API URL changed). */
  clear(): void {
    this.buffers.clear();
  }
}

/** Push every numeric reading of a snapshot into the history. */
export function recordSnapshot(history: SampleHistory, sensors: SensorMap): void {
  for (const [key, sensor] of Object.entries(sensors)) {
    if (typeof sensor.value === "number" && Number.isFinite(sensor.value)) {
      history.push(key, sensor.value);
    }
  }
}
