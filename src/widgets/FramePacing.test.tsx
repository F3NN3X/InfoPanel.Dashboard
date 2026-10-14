import { describe, expect, it } from "vitest";
import { renderModule } from "@/widgets/test-render";
import { TEMPLATE_MODULES } from "./registry";

describe("FramePacing in a single-row zone", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "FramePacing")!;

  it("puts one figure beside the graph and leaves out the budget labels (no height or width to stack them)", () => {
    const html = renderModule(mod, { layout: "simple" });
    expect(html).toContain("Average");
    expect(html).not.toContain("1% low");
    expect(html).not.toContain("Hz ·");
  });
});
