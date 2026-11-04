import { resolveMaterial } from "@/looks/materials";
import { resolveAccent } from "@/widgets/core/look";
import { resolveSurface, SKINS, skinOfLook, textVars } from "@/widgets/core/theme";
import type { PageSkin, WornSurface } from "./island-look";

/**
 * The widget surface the screen's skin gives its widgets, as an island "part of the skin" wears it. Its own
 * module so the kiosk loads the skins only for an island that asks (`useWornSurface`).
 */
export function wornSurface(page: PageSkin): WornSurface {
  // A surface left unset is the skin's own, else glass (`withSkinSurface`).
  const skin = skinOfLook(page.lookId);
  const surf = resolveSurface(page.surface ?? SKINS[skin ?? ""]?.surface, skin);
  const mat = resolveMaterial(surf);
  const sk = SKINS[skin ?? "default"] ?? SKINS.default;
  return {
    className: mat.className,
    style: { ...mat.box, ...textVars(mat.tone), color: "var(--w-fg)" },
    accent: resolveAccent(page.accent, sk, mat.tone),
    ear: mat.patch,
  };
}
