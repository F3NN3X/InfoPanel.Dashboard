import { describe, expect, it } from "vitest";
import { cornerStep, densityOf, knobCustom, knobValue } from "@/components/studio/look-knobs-model";

const term = { surface: "look-term", accent: "#8BE37A" };

describe("the Look knobs", () => {
  it("are Custom only for an own value that differs from the Look's", () => {
    expect(knobCustom({ own: {}, inherited: term }, "accent", term)).toBe(false);
    expect(knobCustom({ own: { accent: "#8BE37A" }, inherited: term }, "accent", term)).toBe(false);
    expect(knobCustom({ own: { accent: "#ff0000" }, inherited: term }, "accent", term)).toBe(true);
    // Surface moves the card with its opacity and blur: any of them makes it Custom.
    expect(knobCustom({ own: { blur: "8" } }, "surface", term)).toBe(true);
  });

  it("ignore a widget's own value while its section follows", () => {
    const values = { own: { accent: "#ff0000" }, inherited: term, applies: () => false };
    expect(knobCustom(values, "accent", term)).toBe(false);
    expect(knobValue(values, "accent")).toBe("#8BE37A");
  });

  it("read the nearest corner step, none for the Look's", () => {
    expect([cornerStep(undefined), cornerStep("auto"), cornerStep("0"), cornerStep("13"), cornerStep("999")]).toEqual([undefined, undefined, 0, 3, 6]);
  });

  it("name the density padding and gap make, Custom when they match none", () => {
    expect(densityOf({ own: {} })).toBe("normal");
    expect(densityOf({ own: { padding: "4", gap: "4" } })).toBe("compact");
    expect(densityOf({ own: { padding: "16" }, inherited: { gap: "16" } })).toBe("roomy");
    expect(densityOf({ own: { padding: "8" } })).toBe("custom");
  });
});
