import { describe, expect, it } from "vitest";
import { ticks } from "./rulers";

describe("ruler ticks", () => {
  it("labels every 100 design px while they fit", () => {
    const majors = ticks(500, 1, 0, 600).filter((t) => t.major).map((t) => t.x);
    expect(majors).toEqual([0, 100, 200, 300, 400, 500]);
    expect(ticks(500, 0.5, 0, 300).filter((t) => t.major).map((t) => t.x)).toEqual([0, 100, 200, 300, 400, 500]);
  });

  it("steps coarser once 100 px labels would collide", () => {
    const majors = ticks(2000, 0.1, 0, 200).filter((t) => t.major).map((t) => t.x);
    expect(majors.slice(0, 3)).toEqual([0, 500, 1000]);
  });
});
