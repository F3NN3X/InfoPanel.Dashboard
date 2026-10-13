import { describe, expect, it } from "vitest";
import { DRAG_THRESHOLD, pastDragThreshold } from "./pointer-drag";

describe("pastDragThreshold", () => {
  it("treats a press that barely moved as a click", () => {
    expect(pastDragThreshold(0, 0)).toBe(false);
    expect(pastDragThreshold(DRAG_THRESHOLD, 0)).toBe(false);
    expect(pastDragThreshold(2, 3)).toBe(false);
  });

  it("starts a drag past 4px in any direction", () => {
    expect(pastDragThreshold(5, 0)).toBe(true);
    expect(pastDragThreshold(0, -5)).toBe(true);
    expect(pastDragThreshold(3, 4)).toBe(true);
  });
});
