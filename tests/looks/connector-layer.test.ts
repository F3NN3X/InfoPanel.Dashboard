import { describe, expect, it } from "vitest";
import { connectorPath } from "@/looks/connector-layer";

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
