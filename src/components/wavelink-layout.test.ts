import { describe, expect, it } from "vitest";
import { pickWaveLinkVariant, standardWidth } from "./wavelink-layout";

const five = { channels: 5, devices: true };

describe("pickWaveLinkVariant", () => {
  it("keeps a forced layout", () => {
    expect(pickWaveLinkVariant(470, 260, "standard", five)).toBe("standard");
    expect(pickWaveLinkVariant(1200, 500, "simple", five)).toBe("simple");
  });

  it("uses the mixer columns where they fit side by side", () => {
    expect(pickWaveLinkVariant(900, 420, "auto", { channels: 6, devices: true })).toBe("standard");
    expect(pickWaveLinkVariant(470, 260, "auto", { channels: 1, devices: false })).toBe("standard");
  });

  it("stacks the rows in a small zone the columns don't fit (the 470×260 kiosk zone)", () => {
    expect(pickWaveLinkVariant(470, 260, "auto", five)).toBe("card");
    expect(pickWaveLinkVariant(300, 480, "auto", five)).toBe("card");
  });

  it("falls back to one line when the zone is short too", () => {
    expect(pickWaveLinkVariant(470, 120, "auto", five)).toBe("compact");
    expect(pickWaveLinkVariant(1600, 60, "auto", five)).toBe("compact");
  });

  it("measures nothing yet: the standard layout", () => {
    expect(pickWaveLinkVariant(0, 0, "auto", five)).toBe("standard");
  });
});

describe("standardWidth", () => {
  it("grows with the columns (capped at six) and the device column", () => {
    expect(standardWidth(1, false)).toBe(128);
    expect(standardWidth(6, true)).toBeLessThanOrEqual(900);
    expect(standardWidth(9, true)).toBe(standardWidth(6, true));
    expect(standardWidth(3, true) - standardWidth(3, false)).toBe(220);
  });
});
