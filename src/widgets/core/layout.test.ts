import { describe, expect, it } from "vitest";
import { boxOf, easeHistory, pickBy, shapeOf, tierOf } from "./layout";

describe("tierOf", () => {
  it("splits at 220×140, 340×210 and 500×320", () => {
    expect(tierOf(219, 400)).toBe("xs");
    expect(tierOf(400, 139)).toBe("xs");
    expect(tierOf(220, 140)).toBe("sm");
    expect(tierOf(339, 400)).toBe("sm");
    expect(tierOf(600, 209)).toBe("sm");
    expect(tierOf(340, 210)).toBe("md");
    expect(tierOf(499, 600)).toBe("md");
    expect(tierOf(600, 319)).toBe("md");
    expect(tierOf(500, 320)).toBe("lg");
  });
});

describe("shapeOf", () => {
  it("is a box without a size", () => {
    expect(shapeOf(0, 100)).toBe("box");
    expect(shapeOf(100, 0)).toBe("box");
  });
  it("detects strips (ratio ≥ 2.6 and under 240 tall)", () => {
    expect(shapeOf(260, 100)).toBe("strip");
    expect(shapeOf(259, 100)).toBe("box");
    expect(shapeOf(780, 240)).toBe("box");
  });
  it("detects columns (ratio ≤ 0.62 and under 260 wide)", () => {
    expect(shapeOf(124, 200)).toBe("column");
    expect(shapeOf(125, 200)).toBe("tile");
    expect(shapeOf(260, 500)).toBe("box");
  });
  it("detects tiles under 240×240", () => {
    expect(shapeOf(239, 239)).toBe("tile");
    expect(shapeOf(240, 239)).toBe("box");
  });
});

describe("boxOf", () => {
  it("measures the tier and shape on the zoomed size", () => {
    expect(boxOf(600, 400, "auto")).toMatchObject({ size: "lg", shape: "box" });
    expect(boxOf(600, 400, "auto", 2)).toMatchObject({ w: 300, h: 200, size: "sm", shape: "box" });
    expect(boxOf(200, 200, undefined, 0.5)).toMatchObject({ w: 400, h: 400, size: "md" });
  });
  it("keeps a forced tier", () => {
    expect(boxOf(100, 100, "lg").size).toBe("lg");
  });
});

describe("pickBy", () => {
  it("picks the tier's entry, md otherwise", () => {
    expect(pickBy("xs", { xs: 1, md: 2 })).toBe(1);
    expect(pickBy("lg", { xs: 1, md: 2 })).toBe(2);
  });
});

describe("easeHistory", () => {
  it("seeds two points from the first value", () => {
    expect(easeHistory([], 10)).toEqual([10, 10]);
  });
  it("eases toward each new value", () => {
    expect(easeHistory([0, 0], 100, 48, 0.5)).toEqual([0, 0, 50]);
    expect(easeHistory([0, 0], 100, 48, 1)).toEqual([0, 0, 100]);
  });
  it("keeps the last `len` points", () => {
    expect(easeHistory([1, 2, 3], 3, 3, 1)).toEqual([2, 3, 3]);
  });
  it("ignores non-finite values", () => {
    const h = [1, 2];
    expect(easeHistory(h, NaN)).toBe(h);
  });
});
