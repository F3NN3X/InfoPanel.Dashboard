import { describe, expect, it } from "vitest";
import { lookOf, sameLook, skinLabel } from "@/lib/theme-skins";

describe("the hidden `default` Look (a panel stored under the v16 `default` skin)", () => {
  it("is the Default skin to the pickers and to \"changed since applied\"", () => {
    expect(lookOf("default")).toBe("classic");
    expect(sameLook("default", "classic")).toBe(true);
    expect(sameLook("default", undefined)).toBe(true);
    expect(sameLook("default", "hud")).toBe(false);
    expect(skinLabel("default")).toBe("Classic");
  });
});
