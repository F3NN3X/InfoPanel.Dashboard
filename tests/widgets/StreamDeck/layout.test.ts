import { describe, expect, it } from "vitest";
import { fitKeys, keyWindows, pageText, swipeOf, titlePx } from "@/widgets/StreamDeck/layout";

describe("fitKeys", () => {
  it("fits square keys by the tighter side and reports the grid's size", () => {
    expect(fitKeys(500, 200, 5, 3, 8)).toEqual({ size: 61, width: 61 * 5 + 32, height: 61 * 3 + 16 });
    expect(fitKeys(200, 500, 5, 3, 8)).toMatchObject({ size: 33 });
  });

  it("answers 0 when nothing fits", () => {
    expect(fitKeys(10, 10, 8, 8, 8).size).toBe(0);
  });
});

describe("swipeOf", () => {
  it("needs a long, mostly sideways travel; leftwards is the next page", () => {
    expect(swipeOf(-80, 10)).toBe(1);
    expect(swipeOf(80, 10)).toBe(-1);
    expect(swipeOf(-30, 0)).toBe(0);
    expect(swipeOf(-80, 60)).toBe(0);
  });
});

describe("titlePx and pageText", () => {
  it("hides titles on tiny keys and scales them with the size choice", () => {
    expect(titlePx(30, "md")).toBe(0);
    expect(titlePx(100, "sm")).toBeLessThan(titlePx(100, "lg"));
  });

  it("counts pages from 1 and holds the number within the total", () => {
    expect(pageText(0, 3)).toBe("1 / 3");
    expect(pageText(5, 3)).toBe("3 / 3");
  });
});

describe("keyWindows", () => {
  it("cuts a 5x3 deck into a 3x3 window and a 2x3 one, every key once, in deck indexes", () => {
    const w = keyWindows(5, 3);
    expect(w.map((x) => [x.cols, x.rows])).toEqual([[3, 3], [2, 3]]);
    expect(w[0].indexes).toEqual([0, 1, 2, 5, 6, 7, 10, 11, 12]);
    expect(w[1].indexes).toEqual([3, 4, 8, 9, 13, 14]);
    expect(w.flatMap((x) => x.indexes).sort((a, b) => a - b)).toEqual(Array.from({ length: 15 }, (_, i) => i));
  });
});
