import { describe, expect, it } from "vitest";
import { createInputState, stepInput } from "@/widgets/core/viz/input";

const DYN = { floorDb: -60, ceilDb: -12, tiltDb: 0, autoGain: true, gain: 1, attackMs: 40, releaseMs: 200 };
const RAW = { capture: null, spectrum: new Float32Array(32).fill(0.7), level: null };

describe("stepInput under reduced motion", () => {
  it("gives the same bands after one frame as after several, so a still frame does not race the loop", () => {
    const once = createInputState();
    stepInput(once, RAW, DYN, 16, 0, true);
    const many = createInputState();
    for (let i = 0; i < 5; i++) stepInput(many, RAW, DYN, 16, i * 16, true);
    expect([...once.input.bands]).toEqual([...many.input.bands]);
  });
});
