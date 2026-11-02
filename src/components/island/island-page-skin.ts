import { patchBackground, resolveAccent } from "@/widgets/core/look";
import { resolveSurface, SKINS, textVars } from "@/widgets/core/theme";
import type { PageSkin, WornSurface } from "./island-look";

/**
 * The widget surface the screen's skin gives its widgets, as an island "part of the skin" wears it. Its own
 * module so the kiosk loads the skins only for an island that asks (`useWornSurface`).
 */
export function wornSurface(page: PageSkin): WornSurface {
  // A surface left unset is the skin's own, else glass (`withSkinSurface`).
  const surf = resolveSurface(page.surface ?? SKINS[page.skin ?? ""]?.surface, page.skin);
  const sk = SKINS[page.skin ?? "default"] ?? SKINS.default;
  return {
    className: surf.c,
    style: { ...surf.s, ...textVars(surf.tone), color: "var(--w-fg)" },
    accent: resolveAccent(page.accent, sk, surf.tone),
    ear: patchBackground(surf.s.background, surf.tone),
  };
}
