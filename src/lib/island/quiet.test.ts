import { describe, expect, it } from "vitest";
import { isQuiet, quietGate } from "./quiet";

const at = (hh: number, mm = 0) => new Date(2026, 0, 1, hh, mm).getTime();
const night = { from: "22:00", to: "07:00", minSeverity: "critical" as const };

describe("quiet hours on the island", () => {
  it("covers a window that wraps midnight, below the minimum severity only", () => {
    expect(isQuiet(night, "warning", at(23))).toBe(true);
    expect(isQuiet(night, "warning", at(6, 59))).toBe(true);
    expect(isQuiet(night, "warning", at(7))).toBe(false);
    expect(isQuiet(night, "critical", at(23))).toBe(false);
  });

  it("covers a same-day window and ignores an empty one", () => {
    const day = { from: "09:00", to: "17:00", minSeverity: "warning" as const };
    expect(isQuiet(day, "info", at(12))).toBe(true);
    expect(isQuiet(day, "warning", at(12))).toBe(false);
    expect(isQuiet({ ...day, to: "09:00" }, "info", at(9))).toBe(false);
    expect(isQuiet(undefined, "info", at(12))).toBe(false);
  });

  it("gates local notices and lets server alerts through", () => {
    const gate = quietGate(night, ["alerts"], () => at(23));
    expect(gate({ source: "system", id: "a", severity: "warning", title: "A" })).toBe(false);
    expect(gate({ source: "alerts", id: "b", severity: "info", title: "B" })).toBe(true);
    expect(gate({ source: "system", id: "c", severity: "critical", title: "C" })).toBe(true);
  });
});
