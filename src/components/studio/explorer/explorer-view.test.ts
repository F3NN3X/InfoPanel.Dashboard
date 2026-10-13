import { describe, expect, it } from "vitest";
import { buildDataModel } from "@/lib/data-points";
import type { Usage, UsageIndex } from "@/lib/data-usage";
import type { ApiSources } from "@/lib/catalog";
import type { SensorMap } from "@/modules/types";
import {
  ALL_SCOPE,
  bindOptions,
  containerScope,
  crumbs,
  flattenRows,
  isBoundTo,
  matchesType,
  resolveBindTarget,
  scopeNote,
  scopeStats,
  streamPath,
  summaryHeading,
  usedByCell,
  valueCell,
  type BindZone,
} from "./explorer-model";
import { sourceIcon } from "./source-icons";

const sources: ApiSources = {
  plugins: [
    {
      id: "meter",
      name: "Audio Meter",
      containers: [
        { id: "main", name: "Main", entries: [{ id: "l", name: "Level", type: "sensor", key: "plugins.meter.main.level" }] },
        { id: "aux", name: "Aux", entries: [{ id: "l", name: "Level", type: "sensor", key: "plugins.meter.aux.level" }] },
      ],
    },
    {
      id: "solo",
      name: "Solo",
      containers: [{ id: "only", name: "Only", entries: [{ id: "n", name: "Name", type: "text", key: "plugins.solo.only.name" }] }],
    },
  ],
};
const sensors: SensorMap = {
  "plugins.meter.main.level": { value: 42, unit: "%" },
  "plugins.meter.aux.level": { value: 0, unit: "%" },
  "plugins.solo.only.name": { text: "Line one\nLine two", unit: "" },
  "system.bridge.status": { text: "running", unit: "" },
  "system.empty": { text: "", unit: "" },
};
const model = buildDataModel(sources, sensors);
const point = (key: string) => model.byKey.get(key)!;
const meter = model.sources.find((s) => s.id === "meter")!;
const solo = model.sources.find((s) => s.id === "solo")!;
const usage = (u: Partial<Usage> & { zoneId: string }): Usage => ({ label: "Panel › Temp", ...u });

describe("matchesType", () => {
  it("keeps empty points out of Text", () => {
    expect(matchesType(point("system.empty"), "text")).toBe(false);
    expect(matchesType(point("system.bridge.status"), "text")).toBe(true);
  });
});

describe("flattenRows group headers", () => {
  it("carries the container title and its source for the header", () => {
    const [group] = flattenRows([point("plugins.meter.aux.level")]);
    expect(group).toMatchObject({ kind: "group", title: "Aux", sourceId: "meter", sourceName: "Audio Meter", count: 1 });
  });
});

describe("streamPath", () => {
  it("streams one key once a second", () => {
    expect(streamPath("cpu.load")).toBe("/events?prefix=cpu.load&interval=1000");
    expect(streamPath("a b")).toBe("/events?prefix=a%20b&interval=1000");
  });
});

describe("valueCell", () => {
  it("colours numbers apart from text and keeps the live reading", () => {
    expect(valueCell(point("plugins.meter.main.level"), { "plugins.meter.main.level": { value: 55, unit: "%" } })).toEqual({
      text: "55 %",
      tone: "number",
    });
    expect(valueCell(point("system.bridge.status"), sensors)).toEqual({ text: "running", tone: "text" });
  });

  it("shows the first line of a list with an ellipsis", () => {
    expect(valueCell(point("plugins.solo.only.name"), {})).toEqual({ text: "Line one …", tone: "text" });
  });

  it("says empty for an empty point", () => {
    expect(valueCell(point("system.empty"), {})).toEqual({ text: "empty", tone: "empty" });
  });
});

describe("usedByCell", () => {
  it("shows a dash, the widget name or a count", () => {
    expect(usedByCell([])).toEqual({ text: "—", used: false });
    expect(usedByCell([usage({ zoneId: "a" })])).toEqual({ text: "Temp", used: true });
    expect(usedByCell([usage({ zoneId: "a", label: "Meter" })]).text).toBe("Meter");
    expect(usedByCell([usage({ zoneId: "a" }), usage({ zoneId: "b" })]).text).toBe("2 widgets");
  });
});

describe("binding target", () => {
  const zones: BindZone[] = [
    { id: "z-meter", title: "Meter" },
    { id: "z-panel", title: "Stats", widgets: [{ id: "w1", label: "Temp" }, { id: "w2", label: "Load" }] },
    { id: "z-empty", title: "Empty panel", widgets: [] },
  ];
  const options = bindOptions(zones);

  it("lists widget zones and each panel widget, but not an empty panel", () => {
    expect(options.map((o) => o.label)).toEqual(["Meter", "Stats › Temp", "Stats › Load"]);
    expect(options[1]).toMatchObject({ zoneId: "z-panel", widgetId: "w1" });
  });

  it("defaults to the selected zone, else the first option", () => {
    expect(resolveBindTarget(options, null, "z-panel")).toBe(options[1]);
    expect(resolveBindTarget(options, null, "gone")).toBe(options[0]);
    expect(resolveBindTarget(options, null, null)).toBe(options[0]);
    expect(resolveBindTarget([], null, null)).toBeNull();
  });

  it("keeps a still-valid choice over the selection", () => {
    expect(resolveBindTarget(options, { zoneId: "z-panel", widgetId: "w2" }, "z-meter")).toBe(options[2]);
    expect(resolveBindTarget(options, { zoneId: "z-panel", widgetId: "removed" }, "z-meter")).toBe(options[0]);
  });

  it("knows whether the point is already bound to the target", () => {
    const used = [usage({ zoneId: "z-panel", panelWidgetId: "w1" }), usage({ zoneId: "z-meter" })];
    expect(isBoundTo(used, options[0])).toBe(true);
    expect(isBoundTo(used, options[1])).toBe(true);
    expect(isBoundTo(used, options[2])).toBe(false);
    expect(isBoundTo(used, null)).toBe(false);
  });
});

describe("scope labels", () => {
  const aux = { kind: "container", id: "meter/aux", sourceId: "meter" } as const;

  it("builds the breadcrumb, with the container only when the source has several", () => {
    expect(crumbs(ALL_SCOPE, model.sources).map((c) => c.label)).toEqual(["All sources"]);
    expect(crumbs(aux, model.sources).map((c) => c.label)).toEqual(["All sources", "Audio Meter", "Aux"]);
    expect(crumbs(aux, model.sources).at(-1)?.scope).toBeNull();
    expect(crumbs({ kind: "container", id: "solo/only", sourceId: "solo" }, model.sources).map((c) => c.label)).toEqual([
      "All sources",
      "Solo",
    ]);
  });

  it("scopes a header click to the source when the source has one container", () => {
    expect(containerScope(model.sources, "solo", "solo/only")).toEqual({ kind: "source", id: "solo" });
    expect(containerScope(model.sources, "meter", "meter/aux")).toEqual(aux);
  });

  it("titles the summary for all, a source and a container", () => {
    expect(summaryHeading(ALL_SCOPE, model.sources)).toEqual({ title: "All data points", sub: `${model.sources.length} sources` });
    expect(summaryHeading({ kind: "source", id: "meter" }, model.sources)).toEqual({ title: "Audio Meter", sub: "Plugins · 2 groups" });
    expect(summaryHeading({ kind: "source", id: "solo" }, model.sources).sub).toBe("Plugins · 1 group");
    expect(summaryHeading(aux, model.sources)).toEqual({ title: "Aux", sub: "Audio Meter" });
  });
});

describe("scopeNote", () => {
  it("only speaks for a group, source or offline source that shows nothing useful", () => {
    expect(scopeNote(ALL_SCOPE, model.sources)).toBeNull();
    expect(scopeNote({ kind: "source", id: "meter" }, model.sources)).toBeNull();
    expect(scopeNote({ kind: "container", id: "meter/aux", sourceId: "meter" }, model.sources)).toMatchObject({ health: "warn" });
    expect(scopeNote({ kind: "container", id: "meter/main", sourceId: "meter" }, model.sources)).toBeNull();
    const dead = [{ ...solo, status: "warn" as const }];
    expect(scopeNote({ kind: "source", id: "solo" }, dead)?.text).toMatch(/check the plugin settings/);
    expect(scopeNote({ kind: "source", id: "solo" }, [{ ...solo, status: "off" as const }])).toMatchObject({ health: "off" });
  });
});

describe("scopeStats", () => {
  it("counts data points, numeric, live, empty and used points", () => {
    const used: UsageIndex = { byKey: new Map([["plugins.meter.main.level", [usage({ zoneId: "z" })]]]), byZone: new Map() };
    const points = meter.containers.flatMap((c) => c.points);
    const live: SensorMap = { "plugins.meter.main.level": { value: 1, unit: "%" } };
    expect(scopeStats(points, live, used)).toEqual([
      { label: "Data points", value: 2 },
      { label: "Numeric", value: 2 },
      { label: "Live-updating", value: 1 },
      { label: "Empty", value: 0 },
      { label: "Used in layout", value: 1 },
    ]);
  });
});

describe("sourceIcon", () => {
  it("picks a plugin icon, with category icons and a fallback", () => {
    const clock = sourceIcon({ id: "clock-plugin", category: "Plugins" });
    expect(clock).not.toBe(sourceIcon({ id: "unknown-plugin", category: "Plugins" }));
    expect(sourceIcon({ id: "other-1", category: "Plugins" })).toBe(sourceIcon({ id: "other-2", category: "Plugins" }));
    expect(sourceIcon({ id: "hwinfo", category: "Hardware monitors" })).not.toBe(sourceIcon({ id: "libre", category: "Hardware monitors" }));
  });
});
