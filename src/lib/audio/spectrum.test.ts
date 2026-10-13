import { describe, expect, it } from "vitest";
import { parseSpectrum, resampleBands } from "./spectrum";

describe("parseSpectrum", () => {
  it("reads the plugin's comma-separated 0..100 bands as 0..1", () => {
    expect([...parseSpectrum("0,50,100")!]).toEqual([0, 0.5, 1]);
  });
  it("clamps out-of-range values", () => {
    expect([...parseSpectrum("-5,120")!]).toEqual([0, 1]);
  });
  it("is null when the entry is missing, empty or malformed", () => {
    for (const raw of [undefined, null, 42, "", "  ", "1,x,3"]) expect(parseSpectrum(raw)).toBeNull();
  });
});

describe("resampleBands", () => {
  it("keeps the loudest band of each group when shrinking", () => {
    expect([...resampleBands([0, 1, 0, 0, 0.5, 0], 3)]).toEqual([1, 0, 0.5]);
  });
  it("interpolates when stretching", () => {
    expect([...resampleBands([0, 1], 3)]).toEqual([0, 0.5, 1]);
  });
  it("copies when the counts match, and zeroes for no input", () => {
    expect([...resampleBands([0.2, 0.4], 2)].map((v) => +v.toFixed(2))).toEqual([0.2, 0.4]);
    expect([...resampleBands([], 2)]).toEqual([0, 0]);
  });
});
