import { describe, expect, it } from "vitest";
import { fmtRate, toMBps } from "./data";

describe("fmtRate", () => {
  it("reads the rate sensors as bytes per second and scales them (decimal prefixes)", () => {
    expect(fmtRate(0)).toBe("0 B/s");
    expect(fmtRate(512)).toBe("512 B/s");
    expect(fmtRate(217_662)).toBe("218 KB/s");
    expect(fmtRate(3_276_000)).toBe("3.28 MB/s");
    expect(fmtRate(107_450_768)).toBe("107 MB/s"); // an Ethernet max: ~860 Mb/s, not 102 GB/s
    expect(fmtRate(2_330_114_048)).toBe("2.33 GB/s");
    expect(fmtRate(NaN)).toBe("–");
  });

  it("shows the chosen unit, bits as 8 per byte", () => {
    const r = 217_662.5625; // a live Ethernet download reading
    expect(fmtRate(r, "MB/s")).toBe("0.22 MB/s");
    expect(fmtRate(r, "Mb/s")).toBe("1.74 Mb/s");
    expect(fmtRate(r, "KB/s")).toBe("218 KB/s");
    expect(fmtRate(r, "Kb/s")).toBe("1,741 Kb/s");
    expect(fmtRate(12_500_000, "Mb/s")).toBe("100 Mb/s");
    expect(fmtRate(r, "Mbps")).toBe("1.74 Mbps"); // Mb/s, written the way ISPs do
  });

  it("converts bytes to MB/s for widgets that print the unit apart", () => {
    expect(toMBps(45_900_000)).toBeCloseTo(45.9);
  });
});
