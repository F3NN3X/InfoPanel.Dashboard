import { describe, expect, it } from "vitest";
import type { DataModel, DataPoint } from "@/lib/data-points";
import { bindPoint, type UsageIndex } from "@/lib/data-usage";
import type { DashboardConfig, MonitorProfile, Placement } from "@/lib/layout";
import { boundRows, inProfile, liveText, pickerResults, PICKER_LIMIT, pointPlace } from "./bound-data-model";

const point = (key: string, patch: Partial<DataPoint> = {}): DataPoint => ({
  key,
  name: key,
  sourceId: "system",
  sourceName: "System",
  containerId: "system/cpu",
  containerRawId: "cpu",
  containerTitle: "CPU",
  raw: "42 %",
  type: "number",
  num: 42,
  unit: "%",
  kind: "Load",
  ...patch,
});

const modelOf = (points: DataPoint[]): DataModel => ({
  sources: [],
  points,
  byKey: new Map(points.map((p) => [p.key, p])),
});

const zone = (patch: Partial<Placement>): Placement => ({
  id: "z1",
  module: "systemmodern",
  colStart: 1,
  rowStart: 1,
  colSpan: 2,
  rowSpan: 1,
  visible: true,
  ...patch,
});

describe("boundRows", () => {
  const usage: UsageIndex = { byKey: new Map(), byZone: new Map([["z1", ["system.cpu.load"]]]) };
  const model = modelOf([point("system.cpu.load")]);

  it("lists the keys a widget zone claims", () => {
    expect(boundRows(zone({}), usage, model)).toEqual([{ key: "system.cpu.load", point: model.byKey.get("system.cpu.load") }]);
  });

  it("lists a panel's widget sensors, also ones the API doesn't list", () => {
    const panel = {
      title: "P",
      widgets: [
        { id: "a", kind: "stat", sensor: "system.cpu.load", subSensor: "x.gone" },
        { id: "b", kind: "clock" },
      ],
    } as Placement["panel"];
    const rows = boundRows(zone({ module: "panel", panel }), usage, model);
    expect(rows.map((r) => [r.key, r.panelWidgetId, r.point !== undefined])).toEqual([
      ["system.cpu.load", "a", true],
      ["x.gone", "a", false],
    ]);
  });
});

describe("liveText", () => {
  it("prefers the live number with its unit", () => {
    expect(liveText({ value: 51, unit: "%" }, point("k"))).toBe("51 %");
    expect(liveText({ value: 3, unit: "" }, undefined)).toBe("3");
  });

  it("falls back to live text, then the snapshot; empty is no data", () => {
    expect(liveText({ text: "running", unit: "" }, point("k"))).toBe("running");
    expect(liveText(undefined, point("k"))).toBe("42 %");
    expect(liveText(undefined, point("k", { type: "empty", raw: "" }))).toBeNull();
    expect(liveText(undefined, undefined)).toBeNull();
  });
});

describe("pointPlace", () => {
  it("names the source and container", () => {
    expect(pointPlace(point("k"))).toBe("System · CPU");
    expect(pointPlace(point("k", { containerTitle: "" }))).toBe("System");
    expect(pointPlace(undefined)).toBe("Not in the live sensor list");
  });
});

describe("pickerResults", () => {
  it("caps the shown results and counts every match", () => {
    const points = Array.from({ length: PICKER_LIMIT + 5 }, (_, i) => point(`system.cpu.p${i}`));
    const { shown, total } = pickerResults(points, "cpu system");
    expect(shown).toHaveLength(PICKER_LIMIT);
    expect(total).toBe(PICKER_LIMIT + 5);
    expect(pickerResults(points, "gpu").total).toBe(0);
  });
});

describe("inProfile", () => {
  it("applies a config edit to one profile", () => {
    const panel = { title: "P", widgets: [{ id: "a", kind: "stat" }] } as Placement["panel"];
    const profile = { id: "p", name: "P", placements: [zone({ module: "panel", panel })] } as unknown as MonitorProfile;
    const config = { profiles: [profile] } as unknown as DashboardConfig;
    const next = inProfile(config, (c) => bindPoint(c, "z1", "a", "system.cpu.load"))(profile);
    expect(next.placements[0].panel?.widgets[0].sensor).toBe("system.cpu.load");
    expect(inProfile(config, (c) => c)(profile)).toBe(profile);
  });
});
