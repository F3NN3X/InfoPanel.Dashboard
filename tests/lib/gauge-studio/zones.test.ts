import { describe, expect, it } from "vitest";
import type { AlertRule } from "@/lib/alerts";
import type { DashboardConfig, Placement } from "@/lib/layout";
import { configRings, ringsOf } from "@/lib/gauge-studio/rings";
import { bandsOf, ruleWatching, stateAt, thresholdsOfCondition, thresholdsOfFill } from "@/lib/gauge-studio/zones";
import { DEFAULT_GAUGE } from "@/lib/infopanel/gauges/vector";

const rule = (id: string, key: string, op: ">" | "<" | "changes", value: number, extra: Partial<AlertRule> = {}): AlertRule => ({
  id, name: id, enabled: true, severity: "warning", cooldownSeconds: 0, outputs: {},
  source: { kind: "sensor", forSeconds: 0, conditions: [{ key, op, value, ...(op === "changes" ? {} : { clearBelow: 60 }) }] },
  ...extra,
});

describe("colour zones", () => {
  it("follows the first enabled rule that compares the sensor with a number", () => {
    const rules = [rule("off", "cpu", ">", 50, { enabled: false }), rule("event", "cpu", "changes", 0), rule("on", "cpu", ">", 65)];
    expect(ruleWatching(rules, "cpu")?.rule.id).toBe("on");
    expect(ruleWatching([rules[0]], "cpu")?.rule.id).toBe("off");
    expect(ruleWatching(rules, "gpu")).toBeNull();
  });

  it("reads a rising rule as normal, close and alert bands, with the state of a reading", () => {
    const t = thresholdsOfCondition({ key: "cpu", op: ">", value: 65, clearBelow: 60 });
    expect(bandsOf(t, "°C")).toEqual([
      { state: "normal", text: "below 60 °C" },
      { state: "close", text: "60-65 °C" },
      { state: "alert", text: "above 65 °C" },
    ]);
    expect([55, 62, 65, 80].map((v) => stateAt(t, v))).toEqual(["normal", "close", "alert", "alert"]);
  });

  it("reads a falling rule the other way round, and a rule with no clear level as two bands", () => {
    const down = thresholdsOfCondition({ key: "disk", op: "<", value: 10, clearBelow: 15 });
    expect([20, 12, 10, 3].map((v) => stateAt(down, v))).toEqual(["normal", "close", "alert", "alert"]);
    expect(bandsOf(down, "%").map((b) => b.text)).toEqual(["above 15 %", "10-15 %", "below 10 %"]);
    expect(bandsOf(thresholdsOfCondition({ key: "cpu", op: ">", value: 65 }), "").map((b) => b.state)).toEqual(["normal", "alert"]);
  });

  it("falls back to the gauge's own Warning and Critical only in Thresholds mode", () => {
    expect(thresholdsOfFill(DEFAULT_GAUGE)).toBeNull();
    const own = { ...DEFAULT_GAUGE, fill: { ...DEFAULT_GAUGE.fill, mode: "thresholds" as const, warn: 70, crit: 90 } };
    expect(thresholdsOfFill(own)).toEqual({ dir: "up", close: 70, alert: 90 });
  });
});

describe("widget rings", () => {
  const on = { profileId: "p", pageId: "pg", screen: "Perf heavy", page: "Main" };
  const zone = (module: string, settings?: Placement["settings"]): Placement => ({ id: "z", module, colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, visible: true, settings });

  it("counts the rings a GPU Rings widget draws and what they read", () => {
    expect(ringsOf(zone("GpuRings"), on)).toMatchObject({ name: "GPU Rings", count: 2, reads: "VRAM, Load" });
    expect(ringsOf(zone("GpuRings", { outer: "power", inner: "fan" }), on)?.reads).toBe("Power, Fan");
  });

  it("counts a System overview's section rings, at most three and never VRAM", () => {
    expect(ringsOf(zone("SystemOverview"), on)).toMatchObject({ count: 3, reads: "CPU, GPU, RAM" });
    expect(ringsOf(zone("SystemOverview", { sections: "cpu,vram,net,disk,gpu" }), on)).toMatchObject({ count: 3, reads: "CPU, Network, Disks" });
    expect(ringsOf(zone("SystemOverview", { sections: "vram" }), on)).toBeNull();
    expect(ringsOf(zone("Clock"), on)).toBeNull();
  });

  it("reads every screen and page of the config", () => {
    const config = { profiles: [{ id: "p", name: "A", pages: [{ id: "a", name: "One", placements: [zone("GpuRings")] }, { id: "b", name: "Two", placements: [zone("Clock")] }] }] } as unknown as DashboardConfig;
    expect(configRings(config).map((r) => [r.on.screen, r.on.page])).toEqual([["A", "One"]]);
  });
});
