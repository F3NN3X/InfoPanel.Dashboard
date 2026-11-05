import { describe, expect, it } from "vitest";
import { accentReadout, colourRoles, ratioText } from "@/components/studio/theme-contrast";

describe("the accent readout", () => {
  it("says a colour is too low on a light card and what its darker shade gives", () => {
    const r = accentReadout("#f2c230", "#efe8d8", "Field Kit");
    expect(r?.low).toBe(true);
    expect(r?.text).toMatch(/^1\.\d:1 on Field Kit's cards, too low for text\. Text in this colour uses a darker shade, \d\.\d:1$/);
  });

  it("passes a colour that holds 4.5:1, and gives none for a colour that is not a hex", () => {
    expect(accentReadout("#1a1c21", "#efe8d8", "Field Kit")?.low).toBe(false);
    expect(accentReadout("rgba(0,0,0,.5)", "#efe8d8", "Field Kit")).toBeUndefined();
    expect(ratioText("hsl(10 10% 10%)", "#ffffff")).toBe("");
  });

  it("does not offer a darker shade on a dark card", () => {
    expect(accentReadout("#202020", "#101010", "Term")?.text).toContain("Pick a lighter colour");
  });

  it("reads each role as the level shows it, over the theme's own, with the lowest status ratio", () => {
    const rows = colourRoles(undefined, undefined, (k) => ({ accent: "#ff0000", ok: "#00ff00", warn: "#888888", crit: "#ff0000" })[k], "#000000");
    expect(rows.map((r) => r.id)).toEqual(["accent", "text", "secondary", "status", "series"]);
    expect(rows[0].swatches).toEqual(["#ff0000"]);
    expect(rows[3].swatches).toHaveLength(3);
    expect(Number.parseFloat(rows[3].ratio)).toBeGreaterThan(1);
    expect(rows[4].swatches).toEqual([]);
  });
});
