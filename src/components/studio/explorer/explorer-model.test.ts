import { describe, expect, it } from "vitest";
import { buildDataModel, type DataPoint } from "@/lib/data-points";
import type { UsageIndex } from "@/lib/data-usage";
import type { ApiSources } from "@/lib/catalog";
import type { SensorMap } from "@/modules/types";
import {
  GROUP_ROW_H,
  POINT_ROW_H,
  displayValue,
  filterPoints,
  filterSources,
  flattenRows,
  matchesType,
  rowAt,
  rowOffsets,
  stickyIndex,
  streamPrefix,
  windowRange,
  type PointFilter,
} from "./explorer-model";

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
const noUsage: UsageIndex = { byKey: new Map(), byZone: new Map() };
const base: PointFilter = {
  scope: { kind: "all" },
  query: "",
  type: "all",
  hideEmpty: false,
  inUse: false,
  usage: noUsage,
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

  it("hides empty points", () => {
    const empty = model.points.filter((p) => p.type === "empty");
    expect(empty.length).toBeGreaterThan(0);
    const shown = filterPoints(model.points, { ...base, hideEmpty: true });
    expect(shown.some((p) => p.type === "empty")).toBe(false);
  });

  it("keeps only points in use", () => {
    const usage: UsageIndex = {
      byKey: new Map([["plugins.meter.main.level", [{ zoneId: "z", label: "Meter" }]]]),
      byZone: new Map(),
    };
    expect(keys(filterPoints(model.points, { ...base, inUse: true, usage }))).toEqual(["plugins.meter.main.level"]);
  });

  it("combines the search with the other filters", () => {
    const shown = filterPoints(model.points, { ...base, query: "level", type: "number" });
    expect(keys(shown).sort()).toEqual(["plugins.meter.aux.level", "plugins.meter.main.level"]);
  });
});

describe("filterSources", () => {
  it("filters by health", () => {
    const warn = filterSources(model.sources, "", "warn");
    expect(warn.every((s) => s.status === "warn")).toBe(true);
  });

  it("keeps a source whose container matches, showing only that container", () => {
    const [meter] = filterSources(model.sources, "aux", null);
    expect(meter.id).toBe("meter");
    expect(meter.containers.map((c) => c.title)).toEqual(["Aux"]);
  });

  it("keeps all containers when the source name matches", () => {
    const [meter] = filterSources(model.sources, "audio", null);
    expect(meter.containers).toHaveLength(2);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterSources(model.sources, "zzz", null)).toEqual([]);
  });

  it("ignores diacritics like the point search does", () => {
    const accented = [{ ...model.sources[0], name: "Écran" }];
    expect(filterSources(accented, "ecran", null)).toHaveLength(1);
    expect(filterSources(accented, "ÉCRAN", null)).toHaveLength(1);
  });
});

describe("flattenRows", () => {
  it("puts a group header before each run of a container", () => {
    const rows = flattenRows(filterPoints(model.points, { ...base, scope: { kind: "source", id: "meter" } }));
    const groups = rows.flatMap((r) => (r.kind === "group" ? [r.count] : []));
    expect(groups.sort()).toEqual([1, 2]);
    expect(rows).toHaveLength(5);
    expect(rows[0].kind).toBe("group");
  });

  it("is empty for no points", () => {
    expect(flattenRows([])).toEqual([]);
  });
});

describe("virtual window", () => {
  const rows = flattenRows(model.points);
  const offsets = rowOffsets(rows);

  it("accumulates heights with the total last", () => {
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(GROUP_ROW_H);
    expect(offsets[2]).toBe(GROUP_ROW_H + POINT_ROW_H);
    expect(offsets).toHaveLength(rows.length + 1);
  });

  it("finds the row at an offset", () => {
    expect(rowAt(offsets, 0)).toBe(0);
    expect(rowAt(offsets, GROUP_ROW_H)).toBe(1);
    expect(rowAt(offsets, GROUP_ROW_H + POINT_ROW_H - 1)).toBe(1);
    expect(rowAt(offsets, 1e9)).toBe(rows.length - 1);
  });

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

  it("finds the group header governing a row", () => {
    expect(stickyIndex(rows, 0)).toBe(0);
    expect(stickyIndex(rows, 2)).toBe(0);
    expect(stickyIndex([], 0)).toBe(-1);
  });
});

describe("displayValue and streamPrefix", () => {
  const point = model.byKey.get("plugins.meter.main.level")!;

  it("prefers the live reading over the snapshot", () => {
    expect(displayValue(point, { [point.key]: { value: 55, unit: "%" } })).toBe("55 %");
    expect(displayValue(point, {})).toBe(point.raw);
  });

  it("uses the common dotted prefix of a group", () => {
    expect(streamPrefix(model.points.filter((p) => p.sourceId === "meter"))).toBe("plugins.meter.");
    expect(streamPrefix([])).toBe("");
  });
});
