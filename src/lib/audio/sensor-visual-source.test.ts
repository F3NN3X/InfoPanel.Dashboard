import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSensorVisualSource } from "./sensor-visual-source";
import type { VisualFrame } from "./types";

/** Runs the source's 20 fps timer for `ms` and returns the last frame's bands. */
function run(setup: (src: ReturnType<typeof createSensorVisualSource>) => void, ms = 3000, bandCount = 4) {
  const src = createSensorVisualSource({ bandCount });
  let last: VisualFrame | null = null;
  src.source.subscribe((f) => (last = f));
  setup(src);
  vi.advanceTimersByTime(ms);
  const bands = [...(last as VisualFrame | null)!.bands].map((v) => +v.toFixed(3));
  src.dispose();
  return bands;
}

describe("createSensorVisualSource", () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout", "performance"] }));
  afterEach(() => vi.useRealTimers());

  it("settles every band on the plugin's spectrum", () => {
    expect(run((s) => (s.setLevel(0.5), s.setSpectrum([0.1, 0.9, 0.4, 0])))).toEqual([0.1, 0.9, 0.4, 0]);
  });

  it("makes every band follow the real level without a spectrum (nothing synthesised)", () => {
    expect(run((s) => (s.setLevel(0.6), s.setSpectrum(null)))).toEqual([0.6, 0.6, 0.6, 0.6]);
  });

  it("is silent when the input is silent", () => {
    expect(run((s) => (s.setLevel(0), s.setSpectrum([0, 0, 0, 0])))).toEqual([0, 0, 0, 0]);
  });

  it("holds still for a constant input once settled: no motion of its own", () => {
    const src = createSensorVisualSource({ bandCount: 4 });
    const frames: number[][] = [];
    src.source.subscribe((f) => frames.push([...f.bands]));
    src.setLevel(0.7);
    src.setSpectrum([0.3, 0.8, 0.5, 0.2]);
    vi.advanceTimersByTime(4000);
    const tail = frames.slice(-10);
    for (const f of tail) expect(f).toEqual(tail[0]);
    src.dispose();
  });

  it("resamples the plugin's band count to its own", () => {
    expect(run((s) => (s.setLevel(1), s.setSpectrum([0, 0, 1, 1, 0, 0, 0.5, 0.5])))).toEqual([0, 1, 0, 0.5]);
  });
});
