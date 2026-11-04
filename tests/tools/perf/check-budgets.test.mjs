import { describe, expect, it } from "vitest";
import { breaches, limitOf, measurePacks, packBreaches } from "../../../tools/perf/check-budgets.mjs";

const b = { kioskEntryGzipBytes: 1000, studioEntryGzipBytes: 2000, entryGzipSlack: 0.01, kioskServerRendererAllowed: false };
const result = (kiosk, studio, extra = {}) => ({ entries: { kiosk: { jsGzip: kiosk, serverRenderer: false, ...extra }, studio: { jsGzip: studio } } });

describe("check-budgets", () => {
  it("lets an entry go over its budget by the slack, and no further", () => {
    expect(limitOf(1000, b)).toBe(1010);
    expect(breaches(result(1010, 2020), b)).toEqual([]);
    expect(breaches(result(1011, 2021), b)).toEqual(["kiosk entry 1011 B gzip > 1010 (budget 1000 + slack)", "studio entry 2021 B gzip > 2020 (budget 2000 + slack)"]);
  });

  it("holds an entry to its exact budget when no slack is set", () => {
    const exact = { ...b, entryGzipSlack: undefined };
    expect(breaches(result(1001, 2000), exact)).toEqual(["kiosk entry 1001 B gzip > 1000 (budget 1000 + slack)"]);
  });

  it("still refuses the server renderer in the kiosk whatever the size", () => {
    expect(breaches(result(10, 10, { serverRenderer: true }), b)).toEqual(["react-dom/server code is in the kiosk closure"]);
  });
});

describe("packBreaches", () => {
  const packs = { packCeilingBytes: 1000, tiny: { codeGzipBytes: 100, assetBytes: 200 } };
  const bp = { ...b, packs };

  it("passes a pack inside its code and asset budgets", () => {
    expect(packBreaches({ tiny: { codeGzip: 100, assetBytes: 200 } }, bp)).toEqual([]);
    expect(packBreaches({}, bp)).toEqual([]);
  });

  it("names the budget a pack goes over", () => {
    expect(packBreaches({ tiny: { codeGzip: 101, assetBytes: 201 } }, bp)).toEqual(["pack tiny code 101 B gzip > 100", "pack tiny assets 201 B > 200"]);
  });

  it("fails a pack without an entry, an inherited name and a pack over the ceiling", () => {
    expect(packBreaches({ other: { codeGzip: 1, assetBytes: 0 }, constructor: { codeGzip: 1, assetBytes: 0 } }, bp)).toEqual(["pack other has no entry in budgets.json packs", "pack constructor has no entry in budgets.json packs"]);
    const big = { packCeilingBytes: 250, tiny: { codeGzipBytes: 100, assetBytes: 200 } };
    expect(packBreaches({ tiny: { codeGzip: 100, assetBytes: 200 } }, { packs: big })).toEqual(["pack tiny is 300 B, over the 250 B ceiling"]);
  });

  it("reads the real packs block: no pack ships yet, so nothing is measured", () => {
    expect(measurePacks()).toEqual({});
  });
});
