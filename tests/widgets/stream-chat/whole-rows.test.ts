import { describe, expect, it } from "vitest";
import { wholeRows } from "@/widgets/stream-chat/whole-rows";

describe("wholeRows", () => {
  const rows = [20, 20, 40, 20]; // oldest first: 20, +3+40, +3+20, +3+20 = 109 with the gaps
  it("counts the newest rows that fit whole, gaps included", () => {
    expect(wholeRows(rows, 109, 3)).toBe(4);
    expect(wholeRows(rows, 100, 3)).toBe(3);
    expect(wholeRows(rows, 62, 3)).toBe(1);
  });
  it("always keeps the newest row, even taller than the space, and never more rows than there are", () => {
    expect(wholeRows([80], 30, 3)).toBe(1);
    expect(wholeRows([10, 10], 500, 3)).toBe(2);
    expect(wholeRows([], 100, 3)).toBe(0);
  });
});
