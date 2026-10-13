import { describe, expect, it } from "vitest";
import { rulerMarks } from "./rulers";

describe("rulerMarks", () => {
  it("labels every 100 design px from 0 up to the board's edge", () => {
    expect(rulerMarks(500)).toEqual([0, 100, 200, 300, 400, 500]);
    expect(rulerMarks(550)).toEqual([0, 100, 200, 300, 400, 500]);
  });

  it("is just the origin for an unmeasured board", () => {
    expect(rulerMarks(0)).toEqual([0]);
    expect(rulerMarks(-5)).toEqual([0]);
  });
});
