/**
 * Colour zones for the editor's stage (spec §5): the bands of a reading, from the alert rule that watches the
 * previewed sensor, else from the gauge's own Warning and Critical numbers. Read only: nothing here writes
 * to the alert config, and the gauge's own spec is never changed by what a rule says.
 */
import type { AlertRule, SensorCondition } from "@/lib/alerts";
import type { VectorGauge } from "@/lib/infopanel/gauges/vector";

export type ZoneState = "normal" | "close" | "alert";

/** Where a reading turns "close" and "alert": rising (a temperature) or falling (free space). */
export interface Thresholds {
  dir: "up" | "down";
  /** The reading gets close from here (a rule's clear level); null: there is no band between normal and alert. */
  close: number | null;
  alert: number;
}

/** The rule that watches `key` with a number to compare: the first enabled one, else the first. */
export function ruleWatching(rules: readonly AlertRule[], key: string): { rule: AlertRule; condition: SensorCondition } | null {
  const hits = rules.flatMap((rule) => {
    if (rule.source.kind !== "sensor") return [];
    const condition = rule.source.conditions.find((c) => c.key === key && [">", ">=", "<", "<="].includes(c.op) && typeof c.value === "number");
    return condition ? [{ rule, condition }] : [];
  });
  return hits.find((h) => h.rule.enabled) ?? hits[0] ?? null;
}

export function thresholdsOfCondition(c: SensorCondition): Thresholds {
  return { dir: c.op === ">" || c.op === ">=" ? "up" : "down", alert: Number(c.value), close: c.clearBelow ?? null };
}

/** The gauge's own Fill thresholds (mode "thresholds"); null in any other mode. */
export function thresholdsOfFill(g: VectorGauge): Thresholds | null {
  const { mode, warn, crit } = g.fill;
  return mode === "thresholds" && warn !== undefined && crit !== undefined ? { dir: "up", close: warn, alert: crit } : null;
}

export function stateAt(t: Thresholds, value: number): ZoneState {
  const past = (limit: number) => (t.dir === "up" ? value >= limit : value <= limit);
  if (past(t.alert)) return "alert";
  return t.close !== null && past(t.close) ? "close" : "normal";
}

export const ZONE_LABEL: Record<ZoneState, string> = { normal: "Normal", close: "Getting close", alert: "Alert" };

const num = (n: number) => String(Math.round(n * 100) / 100);
const withUnit = (text: string, unit: string) => (unit ? `${text} ${unit}` : text);

/** The band's range as words: "below 60 °C", "60-65 °C", "above 65 °C". */
export function bandText(t: Thresholds, state: ZoneState, unit: string): string {
  const up = t.dir === "up";
  if (state === "alert") return withUnit(`${up ? "above" : "below"} ${num(t.alert)}`, unit);
  if (state === "close" && t.close !== null) return withUnit(`${num(Math.min(t.close, t.alert))}-${num(Math.max(t.close, t.alert))}`, unit);
  return withUnit(`${up ? "below" : "above"} ${num(t.close ?? t.alert)}`, unit);
}

/** The bands in order, normal first (a threshold with no clear level has no middle band). */
export function bandsOf(t: Thresholds, unit: string): { state: ZoneState; text: string }[] {
  const states: ZoneState[] = t.close === null ? ["normal", "alert"] : ["normal", "close", "alert"];
  return states.map((state) => ({ state, text: bandText(t, state, unit) }));
}
