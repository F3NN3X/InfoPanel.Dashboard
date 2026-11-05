import { describe, expect, it } from "vitest";
import { buildDataModel, type DataPoint } from "@/lib/data-points";
import type { ApiSources } from "@/lib/catalog";
import type { SensorMap } from "@/modules/types";
import type { AlertsConfig } from "@/lib/alerts";
import {
  POINT_ROW_H,
  alertsByKey,
  changedText,
  displayValue,
  filterPoints,
  filterSources,
  flattenRows,
  isImagePoint,
  matchesType,
  rowOffsets,
  windowRange,
  type PointFilter,
} from "@/components/studio/explorer/explorer-model";

const sources: ApiSources = {
  plugins: [
    {
      id: "meter",
      name: "Audio Meter",
      containers: [
        {
          id: "main",
          name: "Main",
          entries: [
            { id: "l", name: "Level", type: "sensor", key: "plugins.meter.main.level" },
            { id: "n", name: "Device", type: "text", key: "plugins.meter.main.device" },
          ],
        },
        { id: "aux", name: "Aux", entries: [{ id: "l", name: "Level", type: "sensor", key: "plugins.meter.aux.level" }] },
      ],
    },
  ],
};
const sensors: SensorMap = {
  "plugins.meter.main.level": { value: 42, unit: "%" },
  "plugins.meter.main.device": { text: "Speakers", unit: "" },
  "plugins.meter.aux.level": { value: 0, unit: "%" },
  "system.bridge.status": { text: "running", unit: "" },
  "system.empty": { text: "", unit: "" },
};
const model = buildDataModel(sources, sensors);
const base: PointFilter = {
  scope: { kind: "all" },
  query: "",
  type: "all",
  hideEmpty: false,
  inUse: false,
  used: new Set(),
};
const keys = (points: DataPoint[]) => points.map((p) => p.key);

describe("filterPoints", () => {
  it("keeps everything by default", () => {
    expect(filterPoints(model.points, base)).toHaveLength(model.points.length);
  });

  it("narrows by source and container scope", () => {
    const source = filterPoints(model.points, { ...base, scope: { kind: "source", id: "meter" } });
    expect(source).toHaveLength(3);
    const container = filterPoints(model.points, {
      ...base,
      scope: { kind: "container", id: "meter/aux", sourceId: "meter" },
    });
    expect(keys(container)).toEqual(["plugins.meter.aux.level"]);
  });

  it("filters by type", () => {
    expect(keys(filterPoints(model.points, { ...base, type: "number" }))).toContain("plugins.meter.main.level");
    const text = filterPoints(model.points, { ...base, type: "text" });
    expect(text.every((p) => matchesType(p, "text"))).toBe(true);
    expect(keys(text)).toContain("plugins.meter.main.device");
    expect(filterPoints(model.points, { ...base, type: "list" })).toHaveLength(0);
  });

  it("keeps only points in use", () => {
    const used = new Set(["plugins.meter.main.level"]);
    expect(keys(filterPoints(model.points, { ...base, inUse: true, used }))).toEqual(["plugins.meter.main.level"]);
  });

  it("tells a link to a picture from any other link", () => {
    const url = (raw: string): DataPoint => ({ ...model.points[0], type: "url", raw });
    expect(isImagePoint(url("https://cdn.example/grid/ac80.png?x=1"))).toBe(true);
    expect(isImagePoint(url("http://localhost:52312/cover?v=80"))).toBe(true);
    expect(isImagePoint(url("https://example.com/profile"))).toBe(false);
    expect(isImagePoint({ ...model.points[0], type: "text", raw: "/assets/qa/cover.svg" })).toBe(true);
    expect(isImagePoint({ ...model.points[0], type: "text", raw: "Midnight City" })).toBe(false);
    expect(matchesType(url("https://cdn.example/a.jpg"), "image")).toBe(true);
    expect(matchesType(url("https://cdn.example/a.jpg"), "url")).toBe(false);
    expect(matchesType(url("https://example.com/profile"), "url")).toBe(true);
  });

});

describe("filterSources", () => {
  it("filters by health", () => {
    const warn = filterSources(model.sources, "", "warn");
    expect(warn.every((s) => s.status === "warn")).toBe(true);
  });

});

describe("flattenRows", () => {
  const firstContainer = model.points.find((p) => p.key === "plugins.meter.main.level")!.containerId;

  it("heads each container with its source and count, and a folded one keeps only its header", () => {
    const open = flattenRows(model.points, model.sources, new Set());
    const folded = flattenRows(model.points, model.sources, new Set([firstContainer]));
    expect(open.filter((r) => r.kind === "group")).toHaveLength(folded.filter((r) => r.kind === "group").length);
    const header = folded.find((r) => r.kind === "group" && r.id === firstContainer);
    expect(header).toMatchObject({ title: "Audio Meter", sub: "Main", count: 2, collapsed: true });
    expect(folded.some((r) => r.kind === "point" && r.point.containerId === firstContainer)).toBe(false);
    expect(open.length - folded.length).toBe(2);
  });
});

describe("what uses a point", () => {
  it("lists the sensor rules that watch each key, once per rule", () => {
    const alerts = {
      rules: [
        { id: "r1", name: "CPU hot", source: { kind: "sensor", conditions: [{ key: "a", op: ">", value: 1 }, { key: "a", op: "<", value: 0 }] } },
        { id: "r2", name: "Any app", source: { kind: "notification" } },
      ],
    } as unknown as AlertsConfig;
    expect(alertsByKey(alerts)).toEqual(new Map([["a", [{ id: "r1", name: "CPU hot" }]]]));
    expect(alertsByKey(undefined).size).toBe(0);
  });

  it("says when a text value last changed, only once this page has seen it change", () => {
    expect(changedText([{ at: 0, text: "a" }], 60_000)).toBe("unchanged");
    expect(changedText([{ at: 0, text: "a" }, { at: 30_000, text: "b" }], 90_000)).toBe("changed 1 min ago");
  });
});

describe("virtual window", () => {

  it("windows a long list with overscan and clamps at the ends", () => {
    const many = Array.from({ length: 1000 }, (): { kind: "point"; point: DataPoint } => ({
      kind: "point",
      point: model.points[0],
    }));
    const long = rowOffsets(many);
    const mid = windowRange(long, POINT_ROW_H * 500, POINT_ROW_H * 10, 5);
    expect(mid).toEqual({ start: 495, end: 516 });
    expect(windowRange(long, 0, POINT_ROW_H * 10, 5).start).toBe(0);
    expect(windowRange(long, POINT_ROW_H * 1000, POINT_ROW_H * 10, 5).end).toBe(1000);
    expect(windowRange([0], 0, 100)).toEqual({ start: 0, end: 0 });
  });

});

describe("displayValue and streamPrefix", () => {
  const point = model.byKey.get("plugins.meter.main.level")!;

  it("prefers the live reading over the snapshot", () => {
    expect(displayValue(point, { [point.key]: { value: 55, unit: "%" } })).toBe("55 %");
    expect(displayValue(point, {})).toBe(point.raw);
  });

});
