import { describe, expect, it } from "vitest";
import { holdPct } from "@/widgets/core/hold";

describe("holdPct", () => {
  it("keeps the tick on the scale, whatever the value", () => {
    expect(holdPct(0)).toBe(0);
    expect(holdPct(50)).toBe(50);
    expect(holdPct(100)).toBe(100);
    expect(holdPct(180)).toBe(100);
    expect(holdPct(-5)).toBe(0);
    expect(holdPct(Number.NaN)).toBe(0);
  });
});
