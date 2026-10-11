import { describe, expect, it } from "vitest";
import { toolbarPosition } from "./zone-toolbar-position";

const view = { width: 800, height: 600 };
const bar = { width: 300, height: 30 };

describe("toolbarPosition", () => {
  it("sits above the zone, left-aligned", () => {
    const zone = { left: 100, top: 200, width: 200, height: 100 };
    expect(toolbarPosition(zone, view, bar)).toEqual({ left: 100, top: 164, side: "above" });
  });

  it("goes below when there is no room above", () => {
    const zone = { left: 100, top: 10, width: 200, height: 100 };
    expect(toolbarPosition(zone, view, bar)).toEqual({ left: 100, top: 116, side: "below" });
  });

  it("pins inside a zone that leaves no room above or below", () => {
    const zone = { left: 100, top: -50, width: 200, height: 700 };
    expect(toolbarPosition(zone, view, bar)).toEqual({ left: 100, top: 4, side: "inside" });
  });

  it("stays inside the viewport horizontally", () => {
    const right = { left: 700, top: 200, width: 100, height: 100 };
    expect(toolbarPosition(right, view, bar)?.left).toBe(496);
    const left = { left: -60, top: 200, width: 200, height: 100 };
    expect(toolbarPosition(left, view, bar)?.left).toBe(4);
  });

  it("is null when the zone is scrolled out of view", () => {
    expect(toolbarPosition({ left: 100, top: -300, width: 200, height: 100 }, view, bar)).toBeNull();
    expect(toolbarPosition({ left: 900, top: 200, width: 200, height: 100 }, view, bar)).toBeNull();
  });
});
