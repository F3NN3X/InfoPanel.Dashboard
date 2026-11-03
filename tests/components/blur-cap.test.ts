// Limit blur sets --wp-blur-cap on the page root; every backdrop blur on a widget or kiosk surface must go through it.
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { islandSkin } from "@/components/island/island-look";
import { surfaceBox } from "@/components/widget-style";
import { GlassPill } from "@/widgets/core/primitives";

const CAP = 12;
/** Every blur radius in a CSS value or class string, with `min(Npx, var(--wp-blur-cap, Npx))` resolved against the cap. */
const resolved = (css: string): number[] =>
  [...css.matchAll(/min\((\d+)px,\s*var\(--wp-blur-cap,\s*\d+px\)\)/g)].map((m) => Math.min(Number(m[1]), CAP));
/** Tailwind `backdrop-blur-*` classes and `blur(Npx)` values that skip the cap. */
const uncapped = (src: string): string[] =>
  [...src.matchAll(/backdrop-blur(?!-\[min\()[\w-]*|(?<!backdrop-)blur\(\d+px\)/g)].map((m) => m[0]);

describe("Limit blur", () => {
  it("caps the island, the widget surface and the glass pill at the cap", () => {
    const island = islandSkin({ ...ISLAND_DEFAULTS, opacity: 50 } as never).backdropFilter as string;
    expect(resolved(island)).toEqual([CAP]);
    const box = surfaceBox({ background: "#000", fg: "#fff", ring: "#333" }, { blur: 40 } as never).backdropFilter as string;
    expect(Math.max(...resolved(box))).toBe(CAP);
    const pill = renderToStaticMarkup(createElement(GlassPill, null, "x"));
    expect(resolved(pill)).toEqual([CAP]);
  });

  it.each([
    "src/widgets/GameSpotlight.tsx",
    "src/widgets/SteamGame.tsx",
    "src/widgets/core/primitives.tsx",
    "src/components/widgets/panel-overlay.tsx",
    "src/components/alerts/alert-layer.tsx",
    "src/components/island/island-look.ts",
    "src/components/infopanel/ProfileView.tsx",
  ])("%s has no backdrop blur outside the cap", (file) => {
    expect(uncapped(readFileSync(file, "utf8"))).toEqual([]);
  });
});
