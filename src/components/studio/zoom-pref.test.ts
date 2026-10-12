import { describe, expect, it } from "vitest";
import { formatZoomPref, parseZoomPref } from "./zoom-pref";

describe("zoom preference", () => {
  it("defaults to fit", () => {
    expect(parseZoomPref(null)).toEqual({ fitting: true, manual: 1 });
    expect(parseZoomPref("fit")).toEqual({ fitting: true, manual: 1 });
    expect(parseZoomPref("nonsense")).toEqual({ fitting: true, manual: 1 });
    expect(parseZoomPref("9")).toEqual({ fitting: true, manual: 1 });
  });

  it("restores a manual zoom", () => {
    expect(parseZoomPref("1.5")).toEqual({ fitting: false, manual: 1.5 });
  });

  it("round-trips", () => {
    for (const pref of [{ fitting: true, manual: 1 }, { fitting: false, manual: 0.75 }])
      expect(parseZoomPref(formatZoomPref(pref))).toEqual(pref);
  });
});
