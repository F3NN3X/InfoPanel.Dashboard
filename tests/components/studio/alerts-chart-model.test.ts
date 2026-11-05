import { describe, expect, it } from "vitest";
import { addSample } from "@/components/studio/alerts-chart-model";

describe("addSample", () => {
  it("starts again after a gap, so no line crosses it", () => {
    const trail = addSample(addSample([], 1, 0), 2, 1000);
    expect(addSample(trail, 3, 4000)).toHaveLength(3);
    expect(addSample(trail, 3, 4001)).toEqual([{ at: 4001, value: 3 }]);
  });
});
