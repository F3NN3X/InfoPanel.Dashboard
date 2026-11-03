import { describe, expect, it } from "vitest";
import { surfaceBox } from "@/components/widget-style";
import { exportOf, fadeBackground, MATERIALS, makeSurface, makeSurfacePalette, materialVars, resolveMaterial, type MaterialKind } from "@/looks/materials";
import { chromeOf, STANDARD_DEFAULTS } from "@/modules/standard-settings";
import { resolveSurface } from "@/widgets/core/theme";
// What the 27 surfaces resolved to before the registry (BASE_SURFACES, the skins' surfaces, LEGACY_SURFACES, lookBox,
// patchBackground, scrimFor), dumped at e522341b: the registry must give the same strings.
import before from "./__fixtures__/surfaces-p3a.json";

const look = (over: Record<string, string | number | boolean>) => chromeOf({ ...STANDARD_DEFAULTS, ...over });
const CHROMES = {
  none: undefined,
  defaults: chromeOf(STANDARD_DEFAULTS),
  edge: look({ borderWidth: "2", glow: "soft", surfaceOpacity: 50, blur: "8" }),
  ring: look({ borderColor: "#ff0000", glow: "strong" }),
  blur0: look({ blur: "0" }),
};
interface Before {
  c: string;
  tone: string;
  colors: unknown;
  boxes: Record<keyof typeof CHROMES, Record<string, unknown>>;
  patch: string;
  rawPatch: string;
  scrim: string;
}
const old = (name: string): Before => (before.surfaces as unknown as Record<string, Before>)[name];

// vibrancy's 40px blur was a Tailwind class; it is the material's `blur` now, the same filter as an inline style.
const VIBRANCY_BLUR = "blur(min(40px, var(--wp-blur-cap, 40px)))";
// brutal was redesigned on purpose (Gate 2 owner call 4): its accent offset is an inset bar inside the edge, so the card
// keeps its full box instead of shrinking 6px for an outside shadow.
function brutal(box: Record<string, unknown>) {
  const { width: _w, height: _h, ...rest } = box;
  return { ...rest, boxShadow: String(box.boxShadow).replace("5px 5px 0 0 var(--accent)", "inset -5px -5px 0 0 var(--accent)") };
}
const want = (name: string, box: Record<string, unknown>) =>
  name === "vibrancy" && !("backdropFilter" in box) ? { ...box, backdropFilter: VIBRANCY_BLUR, WebkitBackdropFilter: VIBRANCY_BLUR } : name === "brutal" ? brutal(box) : box;
const wantClass = (name: string, c: string) => (name === "vibrancy" ? c.replace("backdrop-blur-[min(40px,var(--wp-blur-cap,40px))] ", "") : c);

describe("material registry", () => {
  it("keeps every stored surface name, in the same order", () => {
    expect(Object.keys(MATERIALS)).toEqual(before.names);
  });

  it.each(before.names)("%s resolves to the strings it drew before", (name) => {
    const mat = MATERIALS[name];
    const was = old(name);
    expect(mat.tone).toBe(was.tone);
    expect(mat.colors ?? null).toEqual(was.colors);
    for (const [key, chrome] of Object.entries(CHROMES)) {
      const r = resolveMaterial(mat, chrome);
      expect(r.className, key).toBe(wantClass(name, was.c));
      expect(r.box, key).toEqual(want(name, was.boxes[key as keyof typeof was.boxes]));
    }
    const r = resolveMaterial(mat);
    expect(r.patch).toBe(was.patch);
    expect(r.patch).toBe(was.rawPatch);
    expect(r.scrim).toBe(was.scrim);
  });

  it("folds the 27 into the contract's kinds (no lcd surface yet)", () => {
    const kinds = new Set(Object.values(MATERIALS).map((m) => m.kind));
    expect([...kinds].sort()).toEqual((["glass", "gradient", "solid"] satisfies MaterialKind[]).sort());
    expect(Object.values(MATERIALS).filter((m) => m.kind === "glass").map((m) => m.id)).toEqual(["studio", "vibrancy", "glass"]);
  });

  it("has an export colour for every material that is not see-through", () => {
    const none = Object.values(MATERIALS).filter((m) => exportOf(m) === null).map((m) => m.id);
    expect(none).toEqual(["outline", "flat"]);
    for (const id of none) expect(MATERIALS[id].s.background).toBe("transparent");
    // A one-colour background is its own export; a gradient names one.
    expect(exportOf(MATERIALS.solid)).toBe("#141418");
    expect(exportOf(MATERIALS.theme)).toBe("hsl(var(--card) / 0.85)");
    expect(exportOf(MATERIALS.glass)).toBe("rgba(24, 24, 27, 0.9)");
  });

  it("fades the export colour with the look's opacity", () => {
    expect(resolveMaterial(MATERIALS.solid, look({ surfaceOpacity: 50 })).export).toBe("rgba(20, 20, 24, 0.5)");
    expect(resolveMaterial(MATERIALS.solid).export).toBe("#141418");
  });

  it("resolves auto to each skin's own material as before", () => {
    for (const [key, name] of Object.entries(before.auto)) {
      const [skin, studio] = key.split("/");
      expect(resolveSurface("auto", skin, studio === "studio").id, key).toBe(name);
    }
  });

  it("builds the app's materials from a tint and an art palette as before", () => {
    const tint: [number, number, number] = [200, 60, 90];
    const art = { vibrant: [220, 40, 80] as [number, number, number], light: [250, 220, 230] as [number, number, number], dark: [40, 10, 20] as [number, number, number] };
    for (const name of ["glass", "matte-light", "matte-dark", "theme"] as const) {
      const was = before.tinted[name];
      expect(makeSurface(name, null)).toEqual(was.plain);
      expect(makeSurface(name, tint)).toEqual(was.tint);
      expect(makeSurfacePalette(name, art)).toEqual(was.palette);
    }
  });
});

describe("fadeBackground", () => {
  it("scales literal colours and mixes color-mix() with transparent", () => {
    expect(fadeBackground("rgba(20, 20, 24, 1)", 0.5)).toBe("rgba(20, 20, 24, 0.5)");
    const f = fadeBackground("radial-gradient(color-mix(in oklab, var(--accent) 38%, transparent), transparent 55%), #0f0f13", 0.5);
    expect(f).toContain("color-mix(in oklab, color-mix(in oklab, var(--accent) 38%, transparent) 50%, transparent)");
    expect(f).toContain("rgba(15, 15, 19, 0.5)");
  });
});

describe("resolveMaterial box", () => {
  it("draws the app's materials through surfaceBox", () => {
    const chrome = look({ borderWidth: "2", glow: "soft", surfaceOpacity: 50, blur: "8" });
    const { color: _c, ...box } = surfaceBox(MATERIALS.glass.colors!, chrome);
    expect(resolveMaterial(MATERIALS.glass, chrome).box).toEqual(box);
    expect(resolveMaterial(MATERIALS.theme).box.boxShadow).toBe("inset 0 0 0 1px hsl(var(--border))");
  });

  it("draws an app material from the cover art's colours when given", () => {
    const art = makeSurfacePalette("glass", { vibrant: [220, 40, 80], light: [250, 220, 230], dark: [40, 10, 20] });
    expect(resolveMaterial(MATERIALS.glass, undefined, art).box.background).toBe(art.background);
  });

  it("adds border, glow, opacity and blur over a template material", () => {
    const s = resolveMaterial(MATERIALS.solid, look({ borderWidth: "3", borderColor: "#ff0000", glow: "strong", surfaceOpacity: 50, blur: "4" })).box;
    expect(s.background).toBe("rgba(20, 20, 24, 0.5)");
    expect(s.boxShadow).toContain("inset 0 0 0 3px #ff0000");
    expect(s.boxShadow).toContain("inset 0 0 32px");
    expect(s.borderWidth).toBe(0);
    expect(s.backdropFilter).toBe("blur(min(4px, var(--wp-blur-cap, 4px)))");
    const neon = resolveMaterial(MATERIALS.neon, look({ glow: "soft" })).box;
    expect(String(neon.boxShadow).startsWith(String(MATERIALS.neon.s.boxShadow))).toBe(true);
  });
});

describe("materialVars", () => {
  it("writes the paint as --w-mat-* variables and keeps the rest of the box inline", () => {
    const v = materialVars(resolveMaterial(MATERIALS.neon)) as Record<string, unknown>;
    expect(v["--w-mat-bg"]).toBe("#0a0a0d");
    expect(v["--w-mat-shadow"]).toBe(MATERIALS.neon.s.boxShadow);
    expect(v["--w-mat-blur"]).toBe("none");
    expect(v["--w-mat-export"]).toBe("#0a0a0d");
    expect(v.borderColor).toBe(MATERIALS.neon.s.borderColor);
    expect(v.background).toBeUndefined();
    expect(v.boxShadow).toBeUndefined();
  });

  it("gives a glass card with a blur its fill at the blur fallback alpha, for where the blur is off", () => {
    const vibrancy = resolveMaterial(MATERIALS.vibrancy);
    expect(vibrancy.fallback).toBe("linear-gradient(180deg, rgba(62,62,68, 0.9), rgba(38,38,42, 0.9))");
    expect((materialVars(vibrancy) as Record<string, unknown>)["--w-mat-fallback"]).toBe(vibrancy.fallback);
    // Classic glass has no blur, so nothing changes; with the look's blur its 0.85 to 0.55 gradient fills to 0.90.
    expect(resolveMaterial(MATERIALS.glass).fallback).toBeUndefined();
    expect(resolveMaterial(MATERIALS.glass, look({ blur: "12" })).fallback).toBe("linear-gradient(155deg, rgba(24, 24, 27, 0.9) 0%, rgba(24, 24, 27, 0.9) 100%)");
    // Not with the blur off, not on a faded card (the look's opacity wins), not on a solid material.
    expect(resolveMaterial(MATERIALS.vibrancy, look({ blur: "0" })).fallback).toBeUndefined();
    expect(resolveMaterial(MATERIALS.glass, look({ blur: "12", surfaceOpacity: 50 })).fallback).toBeUndefined();
    expect(resolveMaterial(MATERIALS.solid, look({ blur: "12" })).fallback).toBeUndefined();
  });

  it("sets every variable, so a nested card never inherits its parent's", () => {
    const v = materialVars(resolveMaterial(MATERIALS.flat)) as Record<string, unknown>;
    expect(v).toEqual({ "--w-mat-bg": "transparent", "--w-mat-shadow": "none", "--w-mat-blur": "none", "--w-mat-export": "transparent" });
  });
});
