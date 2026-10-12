import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createBallistics } from "@/lib/audio/ballistics";
import { dbPos, fmtDb } from "../WaveLink/meters";
import { stepPct, useMeterBallistics, type BallisticsPreset } from "./ballistics";

describe("stepPct", () => {
  it("follows the integrator: instant tracks, peak attacks fast and falls slowly with a hold, vu keeps none", () => {
    const instant = createBallistics("instant");
    stepPct(instant, 80, 0, false);
    expect(stepPct(instant, 20, 100, false).v).toBeCloseTo(20, 5);
    const peak = createBallistics("peak");
    stepPct(peak, 80, 0, true);
    const fall = stepPct(peak, 10, 100, true);
    expect(fall.v).toBeGreaterThan(10);
    expect(fall.v).toBeLessThan(80);
    expect(fall.hold).toBeGreaterThan(70);
    expect(stepPct(createBallistics("vu"), 50, 0, false).hold).toBeUndefined();
  });
  it("treats silence as zero", () => {
    expect(stepPct(createBallistics("peak"), 0, 0, true).v).toBe(0);
  });
});

describe("useMeterBallistics", () => {
  const read = (preset: BallisticsPreset | undefined) => {
    let out: ReturnType<ReturnType<typeof useMeterBallistics>> | undefined;
    const C = () => {
      out = useMeterBallistics(preset)("l", 64);
      return null;
    };
    renderToString(createElement(C));
    return out!;
  };
  it("passes the level through without a preset", () => expect(read(undefined)).toEqual({ v: 64 }));
  it("holds a peak only for presets that keep one", () => {
    expect(read("peak").hold).toBeCloseTo(64, 5);
    expect(read("vu").hold).toBeUndefined();
    expect(read("instant").hold).toBeUndefined();
  });
});

describe("WaveLink meter scale", () => {
  it("maps −60…0 dB to 0…100", () => {
    expect(dbPos(100)).toBe(100);
    expect(dbPos(0)).toBe(0);
    expect(dbPos(10 ** (-30 / 20) * 100)).toBeCloseTo(50, 5);
  });
  it("formats dB with one decimal near full scale and -∞ for silence", () => {
    expect(fmtDb(100)).toBe("0.0");
    expect(fmtDb(10 ** (-30 / 20) * 100)).toBe("-30");
    expect(fmtDb(0)).toBe("-∞");
  });
});
