import { describe, expect, it } from "vitest";
import { createInputState, pickSource, stepInput, type Dynamics, type RawInput } from "./input";

const NEUTRAL: Dynamics = { floorDb: -80, ceilDb: 0, tiltDb: 0, autoGain: false, attackMs: 60, releaseMs: 300, gain: 1 };
const none: RawInput = { capture: null, spectrum: null, level: null };
const round = (a: ArrayLike<number>) => Array.from(a, (v) => +v.toFixed(3));

/** Runs `ms` of 16 ms frames and returns the input. */
function run(raw: RawInput, ms = 4000, dyn = NEUTRAL) {
  const st = createInputState();
  let input = st.input;
  for (let t = 16; t <= ms; t += 16) input = stepInput(st, raw, dyn, 16, t);
  return input;
}

describe("pickSource", () => {
  const capture = { bands: new Float32Array(32), wave: null };
  const spectrum = new Float32Array(32);
  it("prefers capture, then the plugin's spectrum, then the level, else none", () => {
    expect(pickSource({ capture, spectrum, level: 0.5 })).toBe("capture");
    expect(pickSource({ capture: null, spectrum, level: 0.5 })).toBe("plugin");
    expect(pickSource({ capture: null, spectrum: null, level: 0.5 })).toBe("level");
    expect(pickSource({ capture: null, spectrum: null, level: 0 })).toBe("level");
    expect(pickSource(none)).toBe("none");
  });
  it("skips an empty spectrum", () => {
    expect(pickSource({ capture: null, spectrum: new Float32Array(0), level: 0.2 })).toBe("level");
  });
});

describe("stepInput", () => {
  it("settles every band on the plugin's spectrum", () => {
    const input = run({ capture: null, spectrum: Float32Array.from([0.1, 0.9, 0.4, 0]), level: 0.5 });
    expect(input.source).toBe("plugin");
    expect(round(input.bands)).toEqual([0.1, 0.9, 0.4, 0]);
  });

  it("makes every band follow the real level without a spectrum (nothing synthesised)", () => {
    const input = run({ capture: null, spectrum: null, level: 0.6 });
    expect(input.source).toBe("level");
    expect(new Set(round(input.bands))).toEqual(new Set([0.6]));
  });

  it("draws the capture's bands and waveform when it is live", () => {
    const wave = Float32Array.from([0, 0.5, -0.5]);
    const input = run({ capture: { bands: Float32Array.from([0.5, 0.25]), wave }, spectrum: Float32Array.from([1, 1]), level: 1 });
    expect(input.source).toBe("capture");
    expect(round(input.bands)).toEqual([0.5, 0.25]);
    expect(input.wave).toBe(wave);
  });

  it("is silent when the input is silent, and with no source at all", () => {
    expect(round(run({ capture: null, spectrum: new Float32Array(4), level: 0 }).bands)).toEqual([0, 0, 0, 0]);
    const input = run(none);
    expect(input.source).toBe("none");
    expect(input.level).toBe(0);
  });

  it("holds still for a constant input once settled: no motion of its own", () => {
    const st = createInputState();
    const raw = { capture: null, spectrum: Float32Array.from([0.3, 0.8, 0.5, 0.2]), level: 0.7 };
    const dyn = { ...NEUTRAL, tiltDb: 3, autoGain: true, floorDb: -60, ceilDb: -12 };
    const frames: number[][] = [];
    for (let t = 16; t <= 40000; t += 16) frames.push(Array.from(stepInput(st, raw, dyn, 16, t).bands));
    const tail = frames.slice(-10);
    for (const f of tail) expect(f).toEqual(tail[0]);
  });

  it("keeps one history sample per 50 ms of the eased level", () => {
    const st = createInputState();
    for (let t = 10; t <= 1000; t += 10) stepInput(st, { ...none, level: 1 }, { ...NEUTRAL, attackMs: 0 }, 10, t);
    const h = st.input.history;
    expect(h.length).toBe(20);
    expect(h.buf[(h.start + h.length - 1) % h.buf.length]).toBe(1);
  });
});
