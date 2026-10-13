import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import { TEMPLATE_MODULES } from "./registry";

describe("SteamGame", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "SteamGame")!;

  it("sets its text colour on the art so a light surface does not turn the title dark", () => {
    for (const surface of ["theme", "matte-light"]) expect(renderModule(mod, { surface, layout: "card" }), surface).toContain("color:#f4f4f5");
  });

  it("formats the playtime", () => {
    const html = renderModule(mod, { layout: "card" });
    expect(html).toContain("263.4 h");
    expect(html).not.toContain("263.399");
  });
});
