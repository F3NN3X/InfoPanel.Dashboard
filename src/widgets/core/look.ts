// The standard look keys (src/modules/standard-settings.ts) mapped onto the shell (decision 7):
// pure helpers <Widget> composes, so the mapping is testable without a DOM.
import type { CSSProperties } from "react";
import type { ModernChrome } from "@/components/modern-chrome";
import { surfaceBox } from "@/components/widget-style";
import { FONT_STACKS } from "@/lib/general";
import type { Box } from "./layout";
import { pickBy } from "./layout";
import type { SurfaceDef } from "./surfaces";
import { SKINS } from "./theme";
import type { SkinContext, SkinTokens, Tier } from "./types";

export const DEFAULT_ACCENT = "#34d399";

/** Decision 6: an explicit accent always wins; a skin's own accent applies only when none is set. */
export function resolveAccent(explicit: string | undefined, sk: Partial<SkinTokens>): string {
  return explicit || sk.accent || DEFAULT_ACCENT;
}

/** The standard `layout` choices that force a tier; `auto` (or anything else) = measured. */
export const LAYOUT_TIERS: Record<string, Tier> = { card: "lg", standard: "md", compact: "sm", simple: "xs" };

/** The tier to force: the look's `layout` when it names one, else the `size` prop. */
export function forcedTier(layout: unknown, size: Tier | "auto" | undefined): Tier | "auto" | undefined {
  return LAYOUT_TIERS[String(layout)] ?? size;
}

/**
 * The skin context for a widget: the skin's tokens with graph / meter resolved (`auto` = the
 * skin's), and the look applied — `stroke` scales the ring factor and graph strokes, `font`
 * replaces the skin's UI and numeral fonts, `fontWeight` the numeral weight, `gap` is exposed.
 */
export function skinContext(skin: string, opts: { graph?: string; meter?: string; chrome?: ModernChrome } = {}): SkinContext {
  const sk = SKINS[skin] ?? SKINS.default;
  const { graph, meter, chrome } = opts;
  const stroke = chrome?.stroke && chrome.stroke > 0 ? chrome.stroke : 1;
  const font = chrome?.font && chrome.font !== "auto" ? FONT_STACKS[chrome.font] : undefined;
  const weight = chrome?.fontWeight && chrome.fontWeight !== "auto" ? Number(chrome.fontWeight) : undefined;
  return {
    skin,
    ...sk,
    graph: graph && graph !== "auto" ? graph : sk.graph ?? "area",
    meter: meter && meter !== "auto" ? meter : sk.meter ?? "bar",
    ring: (sk.ring ?? 1) * stroke,
    stroke,
    ...(font ? { font, num: font } : null),
    ...(weight ? { numWeight: weight } : null),
    ...(chrome?.gap !== undefined ? { gap: chrome.gap } : null),
  };
}

/**
 * The shell's padding: the template's per-view classes, or the look's `padding` in px when set
 * (it overrides the tier padding; bleed widgets keep none).
 */
export function shellPad(o: {
  box: Box;
  studio: boolean;
  compact: boolean;
  bleed?: boolean;
  tui: boolean;
  padding?: number;
}): { className: string; style?: CSSProperties } {
  const { box, studio, compact, bleed, tui, padding } = o;
  if (bleed && !compact && !studio) return { className: "" };
  if (padding !== undefined) return { className: "", style: { padding } };
  if (studio) return { className: box.h < 100 || (box.w / box.h >= 2.6 && box.h < 130) ? "px-3 py-0" : "px-3 py-2.5" };
  if (tui) return { className: compact ? "px-[14px] pb-3 pt-[16px]" : "px-[14px] pb-[12px] pt-[16px]" };
  if (compact)
    return { className: box.shape === "strip" && box.h < 130 ? "px-4 py-2.5" : box.w < 132 || box.h < 132 ? "p-2.5" : "p-3" };
  return { className: pickBy(box.size, { xs: "p-2.5", sm: "p-3", md: "p-4", lg: "p-5" }) };
}

const DEFAULT_EDGE = "rgba(255, 255, 255, 0.1)";

/**
 * The surface's box style with the look's border, glow, opacity and blur. The app's materials go
 * through `surfaceBox` exactly as the modern widgets draw them; template surfaces keep their own
 * style and gain only what the look sets (the edge becomes an inset shadow of the chosen width).
 */
export function lookBox(surf: SurfaceDef, chrome: ModernChrome | undefined): CSSProperties {
  if (surf.colors) {
    const { color: _color, ...box } = surfaceBox(surf.colors, chrome);
    return box;
  }
  if (!chrome) return surf.s;
  const s = surf.s;
  const edge = chrome.borderWidth !== undefined || !!chrome.borderColor || (!!chrome.glow && chrome.glow !== "none");
  const box = surfaceBox({ background: String(s.background ?? ""), fg: "", ring: String(s.borderColor ?? DEFAULT_EDGE) }, chrome);
  const faded = (chrome.surfaceOpacity ?? 1) < 1 && s.background;
  return {
    ...s,
    ...(faded ? { background: box.background } : null),
    ...(edge ? { boxShadow: [s.boxShadow, box.boxShadow].filter(Boolean).join(", ") } : null),
    ...(chrome.borderWidth !== undefined ? { borderWidth: 0 } : null),
    ...(chrome.blur !== undefined ? { backdropFilter: box.backdropFilter, WebkitBackdropFilter: box.WebkitBackdropFilter } : null),
  };
}
