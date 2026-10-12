import { describe, expect, it } from "vitest";
import { chromeOf, STANDARD_DEFAULTS } from "@/modules/standard-settings";
import { surfaceBox } from "@/components/widget-style";
import { FONT_STACKS } from "@/lib/general";
import { SKINS, SURFACES } from "./theme";
import { DEFAULT_ACCENT, forcedTier, lookBox, resolveAccent, shellPad, skinContext } from "./look";
import type { Box } from "./layout";

const look = (over: Record<string, string | number | boolean>) => chromeOf({ ...STANDARD_DEFAULTS, ...over });

describe("resolveAccent", () => {
  it("prefers an explicit accent over the skin's", () => {
    expect(resolveAccent("#ff0000", SKINS.synth)).toBe("#ff0000");
  });
  it("uses the skin's accent only when none is set", () => {
    expect(resolveAccent("", SKINS.synth)).toBe("#ff4fd8");
    expect(resolveAccent(undefined, SKINS.instrument)).toBe("#7D95FF");
    expect(resolveAccent(undefined, SKINS.default)).toBe(DEFAULT_ACCENT);
  });
});

describe("forcedTier", () => {
  it("maps the standard layouts to tiers", () => {
    expect(forcedTier("card", undefined)).toBe("lg");
    expect(forcedTier("standard", undefined)).toBe("md");
    expect(forcedTier("compact", "lg")).toBe("sm");
    expect(forcedTier("simple", undefined)).toBe("xs");
  });
  it("leaves auto to the size prop / measurement", () => {
    expect(forcedTier("auto", undefined)).toBeUndefined();
    expect(forcedTier("auto", "md")).toBe("md");
    expect(forcedTier(undefined, "auto")).toBe("auto");
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
  it("replaces it with the look's padding when set", () => {
    expect(shellPad({ box: box(600, 400, "lg"), studio: false, compact: false, tui: false, padding: 8 })).toEqual({ className: "", style: { padding: 8 } });
    expect(shellPad({ box: box(300, 200, "sm"), studio: true, compact: false, tui: true, padding: 0 }).style).toEqual({ padding: 0 });
  });
  it("keeps bleed widgets edge to edge", () => {
    expect(shellPad({ box: box(600, 400, "lg"), studio: false, compact: false, bleed: true, tui: false, padding: 12 })).toEqual({ className: "" });
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
  it("lets font, weight and gap override the skin", () => {
    const ctx = skinContext("retro", { chrome: look({ font: "inter", fontWeight: "500", gap: "12" }) });
    expect(ctx.font).toBe(FONT_STACKS.inter);
    expect(ctx.num).toBe(FONT_STACKS.inter);
    expect(ctx.numWeight).toBe(500);
    expect(ctx.gap).toBe(12);
    const auto = skinContext("retro", { chrome: look({}) });
    expect(auto.font).toBe(SKINS.retro.font);
    expect(auto.numWeight).toBe(400);
    expect(auto.gap).toBeUndefined();
  });
});

describe("lookBox", () => {
  it("draws the app's materials through surfaceBox", () => {
    const chrome = look({ borderWidth: "2", glow: "soft", surfaceOpacity: 50, blur: "8" });
    const { color: _c, ...want } = surfaceBox(SURFACES.glass.colors!, chrome);
    expect(lookBox(SURFACES.glass, chrome)).toEqual(want);
    expect(lookBox(SURFACES.theme, undefined).boxShadow).toBe("inset 0 0 0 1px hsl(var(--border))");
  });
  it("keeps a template surface as designed without look keys", () => {
    expect(lookBox(SURFACES.neon, undefined)).toBe(SURFACES.neon.s);
    expect(lookBox(SURFACES.neon, look({}))).toEqual(SURFACES.neon.s);
  });
  it("adds border, glow, opacity and blur over a template surface", () => {
    const s = lookBox(SURFACES.solid, look({ borderWidth: "3", borderColor: "#ff0000", glow: "strong", surfaceOpacity: 50, blur: "4" }));
    expect(s.background).toBe("rgba(20, 20, 24, 0.5)");
    expect(s.boxShadow).toContain("inset 0 0 0 3px #ff0000");
    expect(s.boxShadow).toContain("inset 0 0 32px");
    expect(s.borderWidth).toBe(0);
    expect(s.backdropFilter).toBe("blur(4px)");
    const neon = lookBox(SURFACES.neon, look({ glow: "soft" }));
    expect(String(neon.boxShadow).startsWith(String(SURFACES.neon.s.boxShadow))).toBe(true);
  });
});
