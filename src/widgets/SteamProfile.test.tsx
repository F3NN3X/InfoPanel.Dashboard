import { describe, expect, it } from "vitest";
import { renderModule } from "@/widgets/test-render";
import { TEMPLATE_MODULES } from "./registry";

describe("SteamProfile", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "SteamProfile")!;

  it("shows the friends list only when rows fit under the head and the stats (none with no height)", () => {
    const html = renderModule(mod, { layout: "standard" });
    expect(html).toContain("In-game");
    expect(html).not.toMatch(/<li[ >]/);
  });
});
