import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import { panelLayoutName, zoneMeta, zoneName } from "./zone-meta";

const zone = (patch: Partial<Placement>): Placement => ({
  id: "z",
  module: "systemmodern",
  colStart: 1,
  rowStart: 1,
  colSpan: 3,
  rowSpan: 2,
  visible: true,
  ...patch,
});

const min = { cols: 2, rows: 1 };

describe("zoneMeta", () => {
  it("describes a widget by size, minimum and data points", () => {
    expect(zoneMeta(zone({}), { dataPoints: 12, min })).toBe("3×2 · min 2×1 · 12 data points");
    expect(zoneMeta(zone({}), { dataPoints: 1, min })).toBe("3×2 · min 2×1 · 1 data point");
  });

  it("describes a panel by layout and widget count", () => {
    const panel = { title: "P", widgets: [{ id: "a", kind: "stat" }], layout: "grid" } as Placement["panel"];
    expect(zoneMeta(zone({ module: "panel", panel }), { dataPoints: 0, min })).toBe("Panel · Grid · 1 widget");
  });

  it("describes a blank zone by its size", () => {
    expect(zoneMeta(zone({ module: "blank", colSpan: 2, rowSpan: 1 }), { dataPoints: 0, min })).toBe(
      "Blank zone · 2×1"
    );
  });
});

describe("panelLayoutName", () => {
  it("names legacy and missing layouts a stack", () => {
    expect(panelLayoutName(undefined)).toBe("Stack");
    expect(panelLayoutName("wrap")).toBe("Stack");
    expect(panelLayoutName("stack")).toBe("Stack");
    expect(panelLayoutName("overlay")).toBe("Overlay");
  });
});

describe("zoneName", () => {
  it("prefers a widget's custom title", () => {
    expect(zoneName(zone({ settings: { label: "  CPU  " } }))).toBe("CPU");
    expect(zoneName(zone({ settings: { label: "" } }))).not.toBe("");
    expect(zoneName(zone({ module: "blank" }))).toBe("Blank zone");
  });
});
