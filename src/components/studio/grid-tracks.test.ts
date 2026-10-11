import { describe, expect, it } from "vitest";
import { joinTracks, splitTracks } from "./grid-tracks";

describe("splitTracks", () => {
  it("splits on top-level whitespace, keeping functions whole", () => {
    expect(splitTracks("6px minmax(0, 1fr)  6px")).toEqual(["6px", "minmax(0, 1fr)", "6px"]);
    expect(splitTracks("repeat(3, minmax(0, 1fr)) auto")).toEqual(["repeat(3, minmax(0, 1fr))", "auto"]);
  });

  it("is empty for nothing", () => {
    expect(splitTracks(undefined)).toEqual([]);
    expect(splitTracks("  ")).toEqual([]);
  });
});

describe("joinTracks", () => {
  it("joins trimmed tracks and drops blanks", () => {
    expect(joinTracks([" 1fr", "", "auto "])).toBe("1fr auto");
    expect(joinTracks(["", " "])).toBeUndefined();
  });

  it("round-trips a template", () => {
    const t = "48px minmax(0, 1fr) auto";
    expect(joinTracks(splitTracks(t))).toBe(t);
  });
});
