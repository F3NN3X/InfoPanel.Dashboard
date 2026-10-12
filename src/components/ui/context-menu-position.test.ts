import { describe, expect, it } from "vitest";
import { clampMenuPosition, menuHeight } from "./context-menu-position";

const menu = { width: 220, height: 200 };
const viewport = { width: 1000, height: 700 };

describe("menuHeight", () => {
  it("adds padding, rows and separators", () => {
    expect(menuHeight(0, 0)).toBe(8);
    expect(menuHeight(3, 2)).toBe(8 + 87 + 18);
  });
});

describe("clampMenuPosition", () => {
  it("keeps a menu that fits where it was opened", () => {
    expect(clampMenuPosition(100, 120, menu, viewport)).toEqual({ left: 100, top: 120 });
  });

  it("shifts left and up from the right and bottom edges", () => {
    expect(clampMenuPosition(950, 650, menu, viewport)).toEqual({ left: 1000 - 220 - 8, top: 700 - 200 - 8 });
  });

  it("never leaves the top-left corner", () => {
    expect(clampMenuPosition(-5, -5, menu, viewport)).toEqual({ left: 8, top: 8 });
    expect(clampMenuPosition(0, 0, menu, { width: 100, height: 100 })).toEqual({ left: 8, top: 8 });
  });
});
