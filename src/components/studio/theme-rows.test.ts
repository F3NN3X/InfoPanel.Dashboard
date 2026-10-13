import { describe, expect, it } from "vitest";
import { ADVANCED_TOKENS, VISIBLE_TOKENS, themeRows } from "./theme-rows";

describe("themeRows", () => {
  it("lists every row without a query", () => {
    const rows = themeRows("  ");
    expect(rows.filtering).toBe(false);
    expect(rows.preset && rows.radius).toBe(true);
    expect(rows.visible).toEqual(VISIBLE_TOKENS);
    expect(rows.advanced).toEqual(ADVANCED_TOKENS);
  });

  it("lists only the corner radius for 'radius'", () => {
    const rows = themeRows("radius");
    expect(rows).toMatchObject({ filtering: true, preset: false, radius: true, visible: [], advanced: [] });
  });

  it("lists matching tokens, advanced ones included", () => {
    const rows = themeRows("text");
    expect(rows.preset).toBe(false);
    expect(rows.visible.map(([k]) => k)).toEqual(["card-foreground"]);
    expect(rows.advanced.map(([k]) => k)).toEqual(["primary-foreground", "muted-foreground"]);
  });

  it("lists every row when the query names no row (only the section)", () => {
    const rows = themeRows("colours");
    expect(rows.filtering).toBe(false);
    expect(rows.visible).toEqual(VISIBLE_TOKENS);
  });
});
