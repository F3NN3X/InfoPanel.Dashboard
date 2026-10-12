import { describe, expect, it } from "vitest";
import { formatWithUnit, parseBoxValue, splitUnit } from "./number-box";

describe("splitUnit", () => {
  it("moves a trailing unit out of the label", () => {
    expect(splitUnit("Size (%)")).toEqual({ label: "Size", unit: "%" });
    expect(splitUnit("Blur (px)")).toEqual({ label: "Blur", unit: "px" });
    expect(splitUnit("Corner radius (rem)")).toEqual({ label: "Corner radius", unit: "rem" });
  });

  it("leaves other labels alone", () => {
    expect(splitUnit("Angle (°)")).toEqual({ label: "Angle (°)" });
    expect(splitUnit("Columns")).toEqual({ label: "Columns" });
  });
});

describe("formatWithUnit", () => {
  it("writes the unit as the value box shows it", () => {
    expect(formatWithUnit(100, "%")).toBe("100%");
    expect(formatWithUnit(12, "px")).toBe("12 px");
    expect(formatWithUnit(0.5, "rem")).toBe("0.5 rem");
    expect(formatWithUnit(3)).toBe("3");
  });
});

describe("parseBoxValue", () => {
  it("clamps and snaps typed text", () => {
    expect(parseBoxValue("250", 25, 200, 5)).toBe(200);
    expect(parseBoxValue("12", 25, 200, 5)).toBe(25);
    expect(parseBoxValue("0,7", 0, 1.5, 0.05)).toBe(0.7);
  });

  it("refuses text that is not a number (the box reverts)", () => {
    expect(parseBoxValue("", 0, 10, 1)).toBeNull();
    expect(parseBoxValue("abc", 0, 10, 1)).toBeNull();
  });
});
