import { SlidersHorizontal } from "lucide-react";
import { describe, expect, it } from "vitest";
import { sectionIcon, sectionShort } from "./section-icons";

describe("section icons and short labels", () => {
  it("names the general categories, also under Global style or split across tabs", () => {
    expect(sectionShort({ id: "colors", title: "Colors & surface" })).toBe("Colors");
    expect(sectionShort({ id: "gs-spacing", title: "Spacing & shape" })).toBe("Shape");
    expect(sectionShort({ id: "size@content", title: "Size & alignment" })).toBe("Size");
    expect(sectionIcon({ id: "gs-colors" })).toBe(sectionIcon({ id: "colors" }));
  });

  it("falls back to a generic icon and the title's first word", () => {
    expect(sectionIcon({ id: "m-now-playing" })).toBe(SlidersHorizontal);
    expect(sectionShort({ id: "m-now-playing", title: "Now playing" })).toBe("Now");
    expect(sectionShort({ id: "m-x", title: "Cover & art" })).toBe("Cover");
  });
});
