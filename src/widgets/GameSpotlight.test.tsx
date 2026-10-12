import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import { TEMPLATE_MODULES } from "./registry";
import { hoursText } from "./GameSpotlight";

describe("GameSpotlight", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "GameSpotlight")!;

  it("formats the playtime hours", () => {
    expect(hoursText("263.3999938964844 hrs")).toBe("263.4 h");
    expect(hoursText("263.3999938964844")).toBe("263.4 h");
    expect(hoursText("01:23")).toBe("01:23");
  });

  it("shows the formatted playtime, never the raw float", () => {
    const html = renderModule(mod, { spotlightLayout: "poster", layout: "card" });
    expect(html).toContain("263.4 h");
    expect(html).not.toContain("263.399");
  });

  it("keeps its text light on the white-card theme surface (the color is set on the art, not inherited)", () => {
    for (const surface of ["theme", "matte-light"]) {
      const html = renderModule(mod, { spotlightLayout: "poster", layout: "card", surface });
      expect(html, surface).toContain("color:#f4f4f5");
    }
  });
});
