import { describe, expect, it } from "vitest";
import { makeSurface } from "@/components/surfaces";
import { mix, hue } from "./tokens";
import { BASE_SURFACES, LEGACY_SURFACES } from "./surfaces";
import { SKIN_PACKS, STATE, SURFACES, TEXT_VARS, TONES, heat, rampColor, resolveSurface, textVars, tone } from "./theme";

describe("colour helpers", () => {
  it("mixes and rotates the accent", () => {
    expect(mix(30)).toBe("color-mix(in oklab, var(--accent) 30%, transparent)");
    expect(mix(15, "#1b1b1f")).toBe("color-mix(in oklab, var(--accent) 15%, #1b1b1f)");
    expect(hue(0)).toBe("var(--accent)");
    expect(hue(70)).toBe("oklch(from var(--accent) l c calc(h + 70))");
  });

  it("interpolates ramps and clamps t", () => {
    expect(rampColor(0, "thermal")).toBe("rgb(30,58,138)");
    expect(rampColor(1, "thermal")).toBe("rgb(239,68,68)");
    expect(rampColor(2, "mono")).toBe("rgb(250,250,250)");
    expect(rampColor(0.5, "accent", "#ffffff")).toBe("rgb(140,140,142)");
    expect(rampColor(1, "unknown", "#123456")).toBe("rgb(18,52,86)");
  });

  it("maps a percentage to a heat colour", () => {
    expect(heat(0)).toBe("color-mix(in oklab, var(--accent) 8%, #18181c)");
    expect(heat(100)).toBe("color-mix(in oklab, var(--accent) 100%, #18181c)");
    expect(heat(150)).toBe(heat(100));
    expect(heat(100, "thermal")).toBe("rgb(239,68,68)");
    expect(heat(50, "nope")).toContain("color-mix");
  });

  it("grades a value against warn / crit", () => {
    expect(tone(50, 70, 90)).toBe("ok");
    expect(tone(70, 70, 90)).toBe("warn");
    expect(tone(95, 70, 90)).toBe("crit");
    expect(tone(NaN, 70, 90)).toBe("ok");
    expect(tone(95)).toBe("ok");
  });
});

describe("STATE / TONES", () => {
  it("share the semantic warn and crit colours", () => {
    expect(STATE).toEqual({ ok: "#3CC97F", warn: "#EDB232", crit: "#F2665E", none: "rgba(255,255,255,0.07)" });
    expect(TONES).toEqual({ ok: "var(--accent)", warn: STATE.warn, crit: STATE.crit, muted: "#71717a" });
  });
});

describe("surface registry", () => {
  it("keeps the app's materials with today's output", () => {
    for (const name of ["glass", "matte-light", "matte-dark", "theme"] as const) {
      const s = SURFACES[name];
      const today = makeSurface(name, null);
      expect(s).toBe(LEGACY_SURFACES[name]);
      expect(s.colors).toEqual(today);
      expect(s.s.background).toBe(today.background);
      expect(s.s.boxShadow).toBe(`inset 0 0 0 1px ${today.ring}`);
    }
  });

  it("drops the template's glass in favour of ours", () => {
    expect(BASE_SURFACES.glass).toBeUndefined();
    expect(SURFACES.glass.s.background).not.toContain("rgba(255,255,255,.09)");
  });

  it("resolves every skin's own surface", () => {
    for (const pack of SKIN_PACKS) {
      const name = pack.skin.surface;
      if (name) expect(SURFACES[name], `${pack.name} → ${name}`).toBeDefined();
      expect(resolveSurface("auto", pack.name)).toBe(SURFACES[name ?? "solid"]);
    }
  });

  it("gives every surface a tone", () => {
    for (const [name, s] of Object.entries(SURFACES)) expect(["dark", "light", "theme"], name).toContain(s.tone);
    expect(SURFACES["matte-light"].tone).toBe("light");
    expect(SURFACES.theme.tone).toBe("theme");
    expect(SURFACES.neon.tone).toBe("dark");
  });

  it("defaults to glass, studio for an auto studio variant", () => {
    expect(resolveSurface(undefined, "default")).toBe(SURFACES.glass);
    expect(resolveSurface("", "ios")).toBe(SURFACES.glass);
    expect(resolveSurface("nope", "default")).toBe(SURFACES.glass);
    expect(resolveSurface("auto", "default", true)).toBe(SURFACES.studio);
    expect(resolveSurface("auto", "ios", true)).toBe(SURFACES.ios);
    expect(resolveSurface("auto", "unknown-skin")).toBe(SURFACES.solid);
    expect(resolveSurface("neon", "default")).toBe(SURFACES.neon);
  });
});

describe("textVars", () => {
  it("sets light text on dark surfaces and dark text on light ones", () => {
    expect(textVars("dark")).toEqual({ "--w-fg": "#f4f4f5", "--w-muted": "#a1a1aa", "--w-faint": "#71717a", "--w-track": "rgba(255,255,255,.07)" });
    expect(textVars("light")).toEqual(TEXT_VARS.light);
    expect(TEXT_VARS.light["--w-fg"]).toBe("#18181b");
  });

  it("reads the theme tokens on the theme surface", () => {
    const v = textVars("theme") as Record<string, string>;
    expect(v["--w-fg"]).toBe("hsl(var(--card-foreground))");
    expect(v["--w-muted"]).toBe("hsl(var(--muted-foreground))");
  });

  it("lets the look's text colours override fg and muted", () => {
    const v = textVars("dark", { textColor: "#ff0000", mutedColor: "#00ff00" }) as Record<string, string>;
    expect(v["--w-fg"]).toBe("#ff0000");
    expect(v["--w-muted"]).toBe("#00ff00");
    expect(v["--w-faint"]).toBe("#71717a");
    expect(textVars("light", { textColor: "", mutedColor: "" })).toEqual(TEXT_VARS.light);
  });
});
