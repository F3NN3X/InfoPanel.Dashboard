import { describe, expect, it } from "vitest";
import { resampleBands } from "@/lib/audio/spectrum";
import { bandCentreHz, createGainState, easeBands, shapeBands, tiltOf } from "./dynamics";

/** 0..1 on the plugin's scale for a dBFS value. */
const fromDb = (db: number) => (db + 80) / 80;
const round = (a: ArrayLike<number>) => Array.from(a, (v) => +v.toFixed(3));
const flat = { tiltDb: 0, autoGain: false, state: createGainState() };

describe("shapeBands", () => {
  it("maps floor..ceil to 0..1 and clamps outside it", () => {
    const out = shapeBands([fromDb(-60), fromDb(-36), fromDb(-12), fromDb(-5), fromDb(-70)], new Float32Array(5), { ...flat, floorDb: -60, ceilDb: -12 });
    expect(round(out)).toEqual([0, 0.5, 1, 1, 0]);
  });

  it("passes the plugin's bands through unchanged over the full -80..0 window", () => {
    const raw = Float32Array.from([0.2, 0.8, 0.5, 0]);
    expect(round(shapeBands(raw, new Float32Array(4), { ...flat, floorDb: -80, ceilDb: 0 }))).toEqual([0.2, 0.8, 0.5, 0]);
  });

  it("follows the plugin's spectrum resampled to a bar count", () => {
    const raw = resampleBands(Float32Array.from([0, 0, 1, 1, 0, 0, 0.5, 0.5]), 4);
    expect(round(shapeBands(raw, new Float32Array(4), { ...flat, floorDb: -80, ceilDb: 0 }))).toEqual([0, 1, 0, 0.5]);
  });

  it("tilts each band by dB per octave around 1 kHz at its log centre", () => {
    expect(bandCentreHz(0, 1)).toBeCloseTo(Math.sqrt(30 * 16000), 3);
    expect(tiltOf(3, 0, 1)).toBeCloseTo(3 * Math.log2(Math.sqrt(30 * 16000) / 1000), 6);
    // the same level in every band: the treble rises above the bass by the tilt
    const raw = new Float32Array(32).fill(fromDb(-40));
    const out = shapeBands(raw, new Float32Array(32), { ...flat, tiltDb: 3, floorDb: -80, ceilDb: 0 });
    for (let i = 0; i < 32; i++) expect(out[i]).toBeCloseTo((-40 + tiltOf(3, i, 32) + 80) / 80, 5);
    expect(out[31]).toBeGreaterThan(out[0]);
  });

  it("skips the tilt for a broadband level", () => {
    const out = shapeBands(new Float32Array(4).fill(fromDb(-36)), new Float32Array(4), { ...flat, tiltDb: 6, tilt: false, floorDb: -60, ceilDb: -12 });
    expect(round(out)).toEqual([0.5, 0.5, 0.5, 0.5]);
  });

  it("auto-gain converges so the loudest band sits near 0.9", () => {
    const state = createGainState();
    const raw = Float32Array.from([fromDb(-48), fromDb(-36)]); // 0.25, 0.5 of -60..-12
    const out = new Float32Array(2);
    for (let t = 0; t < 30000; t += 100) shapeBands(raw, out, { floorDb: -60, ceilDb: -12, tiltDb: 0, autoGain: true, state, dtMs: 100 });
    expect(out[1]).toBeCloseTo(0.9, 2);
    expect(out[0]).toBeCloseTo(0.45, 2);
  });

  it("never boosts silence: bands at or below the floor stay 0 whatever the gain", () => {
    const state = createGainState();
    const out = new Float32Array(3);
    for (let t = 0; t < 30000; t += 100) shapeBands([0, fromDb(-70), fromDb(-60)], out, { floorDb: -60, ceilDb: -12, tiltDb: 0, autoGain: true, state, dtMs: 100, gain: 3 });
    expect(round(out)).toEqual([0, 0, 0]);
  });

  it("gain scales the shaped bands (the old sensitivity around its neutral value)", () => {
    const raw = Float32Array.from([0.3, 0.3, 0.3, 0.3]);
    expect(round(shapeBands(raw, new Float32Array(4), { ...flat, floorDb: -80, ceilDb: 0, gain: 2 }))).toEqual([0.6, 0.6, 0.6, 0.6]);
  });
});

describe("easeBands", () => {
  it("eases by time, not per call: one 100 ms step equals ten 10 ms steps", () => {
    const a = new Float32Array(1);
    const b = new Float32Array(1);
    easeBands(a, [1], 100, 60, 300);
    for (let i = 0; i < 10; i++) easeBands(b, [1], 10, 60, 300);
    expect(a[0]).toBeCloseTo(b[0], 5);
    expect(a[0]).toBeCloseTo(1 - Math.exp(-100 / 60), 5);
  });

  it("rises with the attack and falls with the release", () => {
    const up = new Float32Array([0]);
    const down = new Float32Array([1]);
    easeBands(up, [1], 60, 60, 300);
    easeBands(down, [0], 60, 60, 300);
    expect(up[0]).toBeCloseTo(1 - Math.exp(-1), 5);
    expect(down[0]).toBeCloseTo(Math.exp(-60 / 300), 5);
  });

  it("jumps with zero time constants (reduced motion)", () => {
    const cur = new Float32Array([0, 1]);
    easeBands(cur, [0.7, 0.2], 16, 0, 0);
    expect(round(cur)).toEqual([0.7, 0.2]);
  });

  it("settles on the target exactly and then reports no motion", () => {
    const cur = new Float32Array(3);
    const target = Float32Array.from([0.3, 0.8, 0.5]);
    let moving = true;
    for (let i = 0; i < 400 && moving; i++) moving = easeBands(cur, target, 16, 60, 300);
    expect(moving).toBe(false);
    expect(Array.from(cur)).toEqual(Array.from(target));
  });
});
