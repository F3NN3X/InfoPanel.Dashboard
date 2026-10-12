import { describe, expect, it } from "vitest";
import { clippedContent, exceeds, overlaps } from "./qa-geometry";

const box = { left: 0, top: 0, right: 100, bottom: 50 };

describe("exceeds", () => {
  it("is zero inside the box and within tolerance", () => {
    expect(exceeds({ left: 0, top: 0, right: 100, bottom: 50 }, box)).toEqual({ dx: 0, dy: 0 });
    expect(exceeds({ left: -1, top: 0, right: 101, bottom: 51 }, box)).toEqual({ dx: 0, dy: 0 });
  });
  it("reports the worst overshoot per axis", () => {
    expect(exceeds({ left: 0, top: 0, right: 112.5, bottom: 50 }, box)).toEqual({ dx: 12.5, dy: 0 });
    expect(exceeds({ left: 2, top: -3, right: 90, bottom: 60 }, box)).toEqual({ dx: 0, dy: 10 });
    expect(exceeds({ left: -6, top: 0, right: 90, bottom: 40 }, box)).toEqual({ dx: 6, dy: 0 });
  });
});

describe("overlaps", () => {
  const a = { left: 0, top: 0, right: 10, bottom: 10 };
  it("returns the intersection area", () => {
    expect(overlaps(a, { left: 5, top: 5, right: 20, bottom: 20 })).toBe(25);
  });
  it("is zero for disjoint, touching or sliver overlaps", () => {
    expect(overlaps(a, { left: 20, top: 0, right: 30, bottom: 10 })).toBe(0);
    expect(overlaps(a, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(0);
    expect(overlaps(a, { left: 9, top: 9, right: 20, bottom: 20 })).toBe(0);
  });
});

describe("clippedContent", () => {
  const base = { tag: "div", overflowX: "hidden", overflowY: "hidden", textOverflow: "clip", whiteSpace: "normal", scrollWidth: 100, clientWidth: 100, scrollHeight: 40, clientHeight: 40 };
  it("is zero when content fits, within tolerance", () => {
    expect(clippedContent(base)).toEqual({ dx: 0, dy: 0 });
    expect(clippedContent({ ...base, scrollWidth: 101 })).toEqual({ dx: 0, dy: 0 });
  });
  it("reports hidden content per clipped axis", () => {
    expect(clippedContent({ ...base, scrollWidth: 130, scrollHeight: 55 })).toEqual({ dx: 30, dy: 15 });
    expect(clippedContent({ ...base, overflowX: "visible", scrollWidth: 130 })).toEqual({ dx: 0, dy: 0 });
    expect(clippedContent({ ...base, overflowY: "clip", scrollHeight: 60 })).toEqual({ dx: 0, dy: 20 });
  });
  it("ignores deliberate ellipsis truncation and replaced elements", () => {
    expect(clippedContent({ ...base, textOverflow: "ellipsis", whiteSpace: "nowrap", scrollWidth: 300 })).toEqual({ dx: 0, dy: 0 });
    expect(clippedContent({ ...base, textOverflow: "ellipsis", scrollWidth: 300 }).dx).toBe(200);
    expect(clippedContent({ ...base, tag: "CANVAS", scrollWidth: 300 })).toEqual({ dx: 0, dy: 0 });
  });
});
