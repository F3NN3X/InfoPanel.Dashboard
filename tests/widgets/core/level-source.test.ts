import { describe, expect, it } from "vitest";
import { levelFrame, meterZones, sameFrame } from "@/widgets/core/level-source";
import { levelContainerOf } from "@/widgets/shared/audio-data";

describe("levelFrame", () => {
  it("turns % of full scale into dBFS per channel", () => {
    const f = levelFrame(100, 50, 10);
    expect(f.channels.map((c) => c.peakDb)).toEqual([0, expect.closeTo(-6.02, 2), -20]);
  });

  it("reads silence for anything that is not a level, never a made-up one", () => {
    expect(levelFrame(0, -3, Number.NaN, Number.POSITIVE_INFINITY).channels.map((c) => c.peakDb)).toEqual(Array(4).fill(Number.NEGATIVE_INFINITY));
    // over full scale stops at 0 dB
    expect(levelFrame(250).channels[0].peakDb).toBe(0);
  });
});

describe("sameFrame", () => {
  it("is true only for the same levels on the same channels", () => {
    expect(sameFrame(levelFrame(40, 25), levelFrame(40, 25))).toBe(true);
    expect(sameFrame(levelFrame(40, 25), levelFrame(40, 26))).toBe(false);
    expect(sameFrame(levelFrame(40), levelFrame(40, 40))).toBe(false);
    expect(sameFrame(undefined, levelFrame(0))).toBe(false);
    // silence on both is the same
    expect(sameFrame(levelFrame(0), levelFrame(Number.NaN))).toBe(true);
  });
});

describe("meterZones", () => {
  it("starts amber and red where asked, in rising order", () => {
    expect(meterZones(-18, -6)).toEqual([
      { fromDb: Number.NEGATIVE_INFINITY, zone: "ok" },
      { fromDb: -18, zone: "warn" },
      { fromDb: -6, zone: "clip" },
    ]);
  });
});

describe("levelContainerOf", () => {
  const GUID = "81fcb09e-e5cb-43ed-91b5-b02a98683de5";
  const d = {
    "plugins.audio-level-meter.default-audio.device-name": "System",
    [`plugins.audio-level-meter.audio-meter-0-0-0-00000000-${GUID}.device-name`]: "Speakers",
  };
  it("matches a volume entry to its level-meter container by the device GUID, and `default` to the default output", () => {
    expect(levelContainerOf(d, `{0.0.0.00000000}.{${GUID}}`)).toBe(`audio-meter-0-0-0-00000000-${GUID}`);
    expect(levelContainerOf(d, "default")).toBe("default-audio");
  });

  it("finds none for a device the plugin doesn't meter", () => {
    expect(levelContainerOf(d, "{0.0.0.00000000}.{00000000-0000-0000-0000-000000000000}")).toBeUndefined();
    expect(levelContainerOf({}, "default")).toBeUndefined();
  });
});
