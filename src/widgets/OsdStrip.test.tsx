import { describe, expect, it } from "vitest";
import { renderModule } from "@/modules/port-helpers";
import { TEMPLATE_MODULES } from "./registry";

describe("OsdStrip on light surfaces", () => {
  const mod = TEMPLATE_MODULES.find((m) => m.id === "OsdStrip")!;

  it("draws an opaque dark slab with light text, so it reads on a white or matte-light card", () => {
    for (const surface of ["theme", "matte-light"]) {
      const html = renderModule(mod, { surface });
      expect(html, surface).toContain("bg-[#17171b]");
      expect(html, surface).toContain("color:#f4f4f5");
    }
  });
});
