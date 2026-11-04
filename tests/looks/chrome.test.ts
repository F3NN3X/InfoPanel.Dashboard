// The colours a worn pack gives the island's pill and the alerts' cards (L25): readable on every built-in pack, and the black tint only.
import { describe, expect, it } from "vitest";
import { PACK_IDS } from "@/looks/pack";
import { loadPack } from "@/looks/pack-load";
import { contrastOf } from "@/looks/status";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { islandSkin } from "@/components/island/island-look";

const IDS = [...PACK_IDS].filter((id) => id !== "test-pack");
/** index.css mixes the muted alert text 78 % ink over the fill. */
const mix = (ink: string, fill: string) => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [rgb(ink), rgb(fill)];
  return `#${a.map((v, i) => Math.round(v * 0.78 + b[i] * 0.22).toString(16).padStart(2, "0")).join("")}`;
};

describe("a pack's chrome", () => {
  it.each(IDS)("%s: text on its fill is 4.5:1, its muted text too, and the edge is not the fill", async (id) => {
    const chrome = (await loadPack(id))!.chrome!;
    expect(contrastOf(chrome.ink, chrome.fill)).toBeGreaterThanOrEqual(4.5);
    expect(contrastOf(mix(chrome.ink, chrome.fill), chrome.fill)).toBeGreaterThanOrEqual(4.5);
    expect(chrome.edge).not.toBe(chrome.fill);
  });

  it("is the loader's: a pack that loads has it, and an island without one keeps its own colours", async () => {
    expect((await loadPack("paper"))!.chrome).toMatchObject({ fill: expect.stringMatching(/^#/), ink: expect.stringMatching(/^#/) });
    expect(islandSkin({ ...ISLAND_DEFAULTS, tint: "black" }, undefined, undefined).background).toBe("#000000");
  });

  it("Paper's island pill is its light surface with dark text, not black", async () => {
    const chrome = (await loadPack("paper"))!.chrome!;
    const skin = islandSkin({ ...ISLAND_DEFAULTS, tint: "black" }, undefined, chrome);
    expect(skin.background).toBe(chrome.fill);
    expect(skin.background).not.toBe("#000000");
    expect(skin.border).toBe(`1px solid ${chrome.edge}`);
    expect(contrastOf(skin.color, skin.background)).toBeGreaterThanOrEqual(4.5);
  });

  it("only the black tint takes it: a tint someone chose, and Classic's black, stay as they were", async () => {
    const chrome = (await loadPack("paper"))!.chrome!;
    expect(islandSkin({ ...ISLAND_DEFAULTS, tint: "black" })).toMatchObject({ background: "#000000", color: "#ffffff" });
    for (const tint of ["theme", "skin"] as const) expect(islandSkin({ ...ISLAND_DEFAULTS, tint }, undefined, chrome)).toEqual(islandSkin({ ...ISLAND_DEFAULTS, tint }));
    expect(islandSkin({ ...ISLAND_DEFAULTS, tint: "custom", bgColor: "#123456", fgColor: "#ffffff" }, undefined, chrome).background).toBe("#123456");
    expect(islandSkin({ ...ISLAND_DEFAULTS, tint: "black", border: "accent" }, undefined, chrome).border).toBe("1px solid hsl(var(--primary))");
  });
});
