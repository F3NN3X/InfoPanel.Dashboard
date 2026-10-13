import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import { TEMPLATE_MODULES } from "./registry";

describe("MeterBridge in a tile", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "MeterBridge")!;

  it("narrows the name column and drops the dB readout column when there is no width (server render = 0px)", () => {
    const html = renderModule(mod, { layout: "simple", orientation: "horizontal" });
    expect(html).toContain("grid-template-columns:36px minmax(0,1fr)");
    expect(html).not.toMatch(/grid-template-columns:36px minmax\(0,1fr\) \d+px/);
  });
});
