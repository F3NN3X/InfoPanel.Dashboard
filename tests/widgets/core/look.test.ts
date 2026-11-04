import { describe, expect, it } from "vitest";
import { chromeOf, STANDARD_DEFAULTS } from "@/modules/standard-settings";
import { SKINS } from "@/widgets/core/theme";
import { DEFAULT_ACCENT, forcedTier, resolveAccent, shellPad, skinContext } from "@/widgets/core/look";
import type { Box } from "@/widgets/core/layout";

const look = (over: Record<string, string | number | boolean>) => chromeOf({ ...STANDARD_DEFAULTS, ...over });

describe("resolveAccent", () => {
  it("prefers an explicit accent over the skin's", () => {
    expect(resolveAccent("#ff0000", SKINS.synth)).toBe("#ff0000");
  });
});

describe("resolveAccent on light surfaces", () => {
  it("ignores the skin's accent on a light surface, not an explicit one", () => {
    expect(resolveAccent(undefined, SKINS.ink, "light")).toBe(DEFAULT_ACCENT);
    expect(resolveAccent(undefined, SKINS.ink, "dark")).toBe("#f4f4f5");
    expect(resolveAccent("#ff0000", SKINS.ink, "light")).toBe("#ff0000");
  });
});

describe("forcedTier", () => {
  it("forces the Density tier", () => {
    expect(forcedTier({ sizeTier: "lg" }, undefined)).toBe("lg");
    expect(forcedTier({ sizeTier: "sm" }, "lg")).toBe("sm");
  });
});

const box = (w: number, h: number, size: Box["size"], shape: Box["shape"] = "box"): Box => ({ w, h, size, shape });

describe("shellPad", () => {
  it("uses the template's tier padding", () => {
    expect(shellPad({ box: box(600, 400, "lg"), studio: false, compact: false, tui: false })).toEqual({ className: "p-5" });
    expect(shellPad({ box: box(200, 100, "xs"), studio: false, compact: false, tui: false })).toEqual({ className: "p-2.5" });
    expect(shellPad({ box: box(300, 100, "xs", "strip"), studio: false, compact: true, tui: false }).className).toBe("px-4 py-2.5");
    expect(shellPad({ box: box(300, 200, "sm"), studio: true, compact: false, tui: false }).className).toBe("px-3 py-2.5");
    expect(shellPad({ box: box(300, 80, "xs"), studio: true, compact: false, tui: false }).className).toBe("px-3 py-0");
  });
});

describe("skinContext", () => {
  it("resolves graph and meter from the skin unless set", () => {
    expect(skinContext("tui")).toMatchObject({ skin: "tui", graph: "braille", meter: "blocks", stroke: 1, ring: 0.8 });
    expect(skinContext("tui", { graph: "line", meter: "auto" })).toMatchObject({ graph: "line", meter: "blocks" });
    expect(skinContext("default")).toMatchObject({ graph: "area", meter: "bar", ring: 1 });
  });
  it("multiplies the ring factor and graph strokes by the stroke option", () => {
    const ctx = skinContext("ios", { chrome: look({ stroke: 150 }) });
    expect(ctx.stroke).toBe(1.5);
    expect(ctx.ring).toBeCloseTo(1.7 * 1.5);
  });
});

describe("shellPad decor", () => {
  it("reports the smallest side in px only when asked, and leaves the output alone otherwise", () => {
    const o = { studio: false, compact: false, tui: false };
    expect(shellPad({ ...o, box: box(600, 400, "lg"), decor: true })).toEqual({ className: "p-5", pad: 20 });
    expect(shellPad({ ...o, box: box(200, 100, "xs"), decor: true }).pad).toBe(10);
    expect(shellPad({ ...o, box: box(200, 100, "xs"), padding: 7, decor: true })).toEqual({ className: "", style: { padding: 7 }, pad: 7 });
    expect(shellPad({ ...o, box: box(200, 100, "xs"), bleed: true, decor: true }).pad).toBe(0);
    expect(shellPad({ ...o, box: box(600, 400, "lg") })).not.toHaveProperty("pad");
  });
});
