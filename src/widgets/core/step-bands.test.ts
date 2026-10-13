import { describe, expect, it } from "vitest";
import { NEUTRAL_SENS, stepBands, type BandState } from "./primitives";

const settle = (input: Parameters<typeof stepBands>[1], B = 4, frames = 200) => {
  const st: BandState = { v: [], pk: [], lv: 0 };
  for (let i = 0; i < frames; i++) stepBands(st, input, B);
  return st.v.map((v) => +v.toFixed(3));
};

describe("stepBands", () => {
  it("follows the plugin's spectrum, resampled to the bar count", () => {
    expect(settle({ spectrum: Float32Array.from([0.2, 0.8, 0.5, 0]), sens: NEUTRAL_SENS })).toEqual([0.2, 0.8, 0.5, 0]);
  });
  it("without a spectrum, every bar is the real level (no envelope, no wobble)", () => {
    expect(settle({ lv: 0.5, l: 0.3, r: 0.4, sens: 1 })).toEqual([0.5, 0.5, 0.5, 0.5]);
  });
  it("is flat zero in silence", () => {
    expect(settle({ lv: 0, sens: 1.5 })).toEqual([0, 0, 0, 0]);
  });
  it("sensitivity scales the spectrum around the neutral value", () => {
    expect(settle({ spectrum: Float32Array.from([0.3, 0.3, 0.3, 0.3]), sens: NEUTRAL_SENS * 2 })).toEqual([0.6, 0.6, 0.6, 0.6]);
  });
});
