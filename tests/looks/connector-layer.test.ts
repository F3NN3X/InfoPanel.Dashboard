import { describe, expect, it } from "vitest";
import { connectorPath, hubLinks } from "@/looks/connector-layer";
import { connectorZones } from "@/looks/connector-zones";

const a = { x: 0, y: 0, width: 100, height: 50 };

describe("connectorPath", () => {
  it("joins the facing edges of two zones side by side", () => {
    const b = { x: 200, y: 100, width: 100, height: 50 };
    expect(connectorPath(a, b, "line")).toMatchObject({ from: [100, 25], to: [200, 125], d: "M100 25L200 125" });
  });
  it("bends an elbow once at the middle", () => {
    const b = { x: 200, y: 100, width: 100, height: 50 };
    expect(connectorPath(a, b, "elbow").d).toBe("M100 25H150V125H200");
  });
  it("goes edge to edge vertically when the zones are stacked, either way round", () => {
    const below = { x: 0, y: 150, width: 100, height: 50 };
    expect(connectorPath(a, below, "line")).toMatchObject({ from: [50, 50], to: [50, 150] });
    expect(connectorPath(below, a, "line")).toMatchObject({ from: [50, 150], to: [50, 50] });
  });
});

describe("hubLinks", () => {
  const z = (id: string, colSpan: number, rowSpan: number) => ({ id, colSpan, rowSpan });
  it("joins the zone that spans the most cells to each other zone", () => {
    expect(hubLinks([z("a", 3, 3), z("core", 4, 4), z("b", 4, 3)])).toEqual([["core", "a"], ["core", "b"]]);
  });
  it("takes the first of equals, and draws nothing for one zone or none", () => {
    expect(hubLinks([z("a", 2, 2), z("b", 2, 2), z("c", 1, 1)])).toEqual([["a", "b"], ["a", "c"]]);
    expect(hubLinks([z("only", 4, 4)])).toEqual([]);
    expect(hubLinks([])).toEqual([]);
  });
});

describe("connectorZones", () => {
  const p = (id: string, module: string, colSpan: number, rowSpan: number, visible = true) => ({ id, module, colStart: 1, rowStart: 1, colSpan, rowSpan, visible });
  const grid = { cols: 12, rows: 6 };
  it("keeps the visible widget zones and drops the items layer, a canvas, a page-sized node and hidden zones", () => {
    const placements = [
      p("items-layer:a", "infopanel", 12, 6),
      p("c", "infopanel", 4, 4),
      p("full", "CpuMonitor", 12, 6),
      p("hid", "GpuMonitor", 4, 3, false),
      p("core", "FpsMonitor", 4, 4),
      p("side", "Thermals", 4, 3),
    ];
    expect(connectorZones(placements, grid)).toEqual([{ id: "core", colSpan: 4, rowSpan: 4 }, { id: "side", colSpan: 4, rowSpan: 3 }]);
    expect(hubLinks(connectorZones(placements, grid))).toEqual([["core", "side"]]);
  });
});
