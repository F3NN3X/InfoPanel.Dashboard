import { describe, expect, it } from "vitest";
import { renderModule } from "@/widgets/test-render";
import { TEMPLATE_MODULES } from "./registry";

describe("PlaytimeShare", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "PlaytimeShare")!;

  it("lists no game rows (not a clipped one) when the zone has no height for them", () => {
    const html = renderModule(mod, { layout: "card" });
    expect(html).toContain("Last 2 weeks");
    expect(html).not.toMatch(/<li[ >]/);
  });
});
