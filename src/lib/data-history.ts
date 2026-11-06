import { SampleHistory, SAMPLE_GAP_MS } from "@/lib/sample-history";
import type { SensorMap } from "@/modules/types";

/** Distinct values kept per text key (the detail pane's "Recent values"). */
export const CHANGES_KEPT = 5;

/** A value a text, link or image point held, and when this page first saw it. */
export interface Change {
  at: number;
  text: string;
}

/**
 * What the Data view remembers about the rows it shows: one ring buffer per watched number (the last minute), and the
 * last few distinct values of each watched text key. Only the keys it is told to watch are recorded, so the cost follows
 * the rows in view and the selected point, not the 600-odd points the Data API serves. Mutable on purpose, like
 * `SampleHistory`: it takes a push per watched key per second.
 */
export class HistoryRecorder {
  readonly history = new SampleHistory();
  private watched = new Set<string>();
  private readonly changes = new Map<string, Change[]>();
  private lastSampleAt = 0;

  /** Watch exactly these keys. One that just joined starts with its current reading; one that left is forgotten. */
  watch(keys: Iterable<string>, values: SensorMap, now: number): void {
    const next = new Set(keys);
    for (const key of this.watched) {
      if (next.has(key)) continue;
      this.history.forget(key);
      this.changes.delete(key);
    }
    for (const key of next) if (!this.watched.has(key)) this.record(key, values, now);
    this.watched = next;
  }

  /** One reading of every watched key, at most once per `SAMPLE_GAP_MS`; whether it took one. */
  sample(values: SensorMap, now: number): boolean {
    if (now - this.lastSampleAt < SAMPLE_GAP_MS) return false;
    this.lastSampleAt = now;
    for (const key of this.watched) this.record(key, values, now);
    return true;
  }

  /** Start the watched keys over (the Data API changed, or the page was hidden for a while). */
  restart(values: SensorMap, now: number): void {
    this.history.clear();
    this.changes.clear();
    this.lastSampleAt = 0;
    for (const key of this.watched) this.record(key, values, now);
  }

  /** The distinct values of a text key, oldest first; the last is the current one. */
  changesOf(key: string): readonly Change[] {
    return this.changes.get(key) ?? [];
  }

  private record(key: string, values: SensorMap, now: number): void {
    const sensor = values[key];
    if (!sensor) return;
    if (typeof sensor.value === "number" && Number.isFinite(sensor.value)) {
      this.history.push(key, sensor.value);
      return;
    }
    const text = sensor.text?.trim() ?? "";
    const seen = this.changes.get(key) ?? [];
    if (seen.at(-1)?.text === text) return;
    this.changes.set(key, [...seen, { at: now, text }].slice(-CHANGES_KEPT));
  }
}
