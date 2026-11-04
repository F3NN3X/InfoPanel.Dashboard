import { describe, expect, it } from "vitest";
import { iconSetIssues, parseIconSet } from "@/looks/icon-set";

const glyph = { viewBox: "0 0 24 24", d: "M2 2h20v20H2z" };

describe("icon sets", () => {
  it("accepts a map of listed names to single-path glyphs", () => {
    expect(iconSetIssues({ memory: glyph })).toEqual([]);
    expect(parseIconSet(JSON.stringify({ memory: glyph }))).toEqual({ memory: glyph });
  });

  it.each([
    ["a name off the list", { "not-an-icon": glyph }],
    ["markup in the path", { memory: { ...glyph, d: "M0 0<script>" } }],
    ["a url in the path", { memory: { ...glyph, d: "url(x)" } }],
    ["an odd viewBox", { memory: { ...glyph, viewBox: "0 0 24 24 foo" } }],
    ["a path over the cap", { memory: { ...glyph, d: "M0 0".repeat(1000) } }],
    ["a missing path", { memory: { viewBox: "0 0 24 24" } }],
    ["an array", [glyph]],
    ["a __proto__ key", JSON.parse('{"__proto__":{"viewBox":"0 0 24 24","d":"M0 0"}}')],
  ])("refuses %s", (_, set) => {
    expect(iconSetIssues(set)).not.toEqual([]);
  });

  it("refuses text that is not JSON, and a set with any issue, whole", () => {
    expect(parseIconSet("{")).toBeUndefined();
    expect(parseIconSet(JSON.stringify({ memory: glyph, nope: glyph }))).toBeUndefined();
  });
});
