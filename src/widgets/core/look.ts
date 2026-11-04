// The standard look keys (src/modules/standard-settings.ts) mapped onto the shell (decision 7):
// pure helpers <Widget> composes, so the mapping is testable without a DOM.
import type { CSSProperties } from "react";
import type { ModernChrome } from "@/components/modern-chrome";
import { FONT_STACKS } from "@/lib/general";
import type { SurfaceTone } from "@/looks/materials";
import type { PackSlots } from "@/looks/pack";
import { DEFAULT_ACCENT } from "@/looks/palette";
import { sizeTierOf } from "@/modules/setting-readers";
import { chromeOf } from "@/modules/standard-settings";
import type { ModuleSettings } from "@/modules/types";
import type { Box } from "./layout";
import { pickBy } from "./layout";
import { SKINS } from "./theme";
import { t3Tokens } from "./t3-tokens";
import type { Compact, SkinContext, SkinTokens, Studio, Tier } from "./types";

export { DEFAULT_ACCENT };

/**
 * Decision 6: an explicit accent always wins; a skin's own accent applies only when none is set
 * and the surface is not light (the skins' accents are pale or neon, invisible on a light card).
 */
export function resolveAccent(explicit: string | undefined, sk: Partial<SkinTokens>, tone?: SurfaceTone): string {
  return explicit || (tone === "light" ? undefined : sk.accent) || DEFAULT_ACCENT;
}

/** The zone's own icon and title replace the template descriptor's (explicit settings win). */
export function withUserLook<T extends Compact | Studio>(c: T, user: { icon?: string; label?: string }): T {
  return user.icon || user.label ? { ...c, ...(user.icon ? { icon: user.icon } : null), ...(user.label ? { label: user.label } : null) } : c;
}

/** A summary view without its title line when the look's Show title is off (the views skip an empty label). */
export function untitled<T extends Compact | Studio>(c: T, titled: boolean): T {
  return titled ? c : { ...c, label: "" };
}

/** The tier to force: the look's Density (`sizeTier`, the old `layout`) when it names one, else the `size` prop. */
export function forcedTier(look: ModuleSettings | undefined, size: Tier | "auto" | undefined): Tier | "auto" | undefined {
  return (look && sizeTierOf(look)) ?? size;
}

/**
 * The skin context for a widget: the skin's tokens with graph / meter resolved (`auto` = the
 * skin's), and the look applied — `stroke` scales the ring factor and graph strokes, `font`
 * replaces the skin's UI and numeral fonts, `fontWeight` the numeral weight, `gap` is exposed.
 * A Look's T3 values (`t3`) set the tokens they differ from Classic in, over the skin's.
 */
export function skinContext(skin: string, opts: { graph?: string; meter?: string; chrome?: ModernChrome; t3?: Record<string, string | number>; slots?: PackSlots; packed?: boolean } = {}): SkinContext {
  const sk = { ...(SKINS[skin] ?? SKINS.default), ...t3Tokens(opts.t3) };
  const { graph, meter, chrome } = opts;
  const stroke = chrome?.stroke && chrome.stroke > 0 ? chrome.stroke : 1;
  // A worn pack draws its own faces (pack.css), so the look's Font does not reach it: inline styles would beat the pack's rules (L80).
  const font = !opts.packed && chrome?.font && chrome.font !== "auto" ? FONT_STACKS[chrome.font] : undefined;
  const weight = chrome?.fontWeight && chrome.fontWeight !== "auto" ? Number(chrome.fontWeight) : undefined;
  return {
    skin,
    ...sk,
    ...opts.slots,
    graph: graph && graph !== "auto" ? graph : sk.graph ?? "area",
    meter: meter && meter !== "auto" ? meter : sk.meter ?? "bar",
    ring: (sk.ring ?? 1) * stroke,
    stroke,
    ...(font ? { font, num: font } : null),
    ...(weight ? { numWeight: weight } : null),
    ...(chrome?.gap !== undefined ? { gap: chrome.gap } : null),
    ...(chrome?.smoothing === "smooth" ? { smooth: true } : null),
  };
}

/**
 * The shell's padding: the template's per-view classes, or the look's `padding` in px when set
 * (it overrides the tier padding; bleed widgets keep none). With `decor`, `pad` is the smallest side in px: what the
 * shell exposes as `--wp-pad` so a frame or ornament reaches the card edge only through it.
 */
export function shellPad(o: {
  box: Box;
  studio: boolean;
  compact: boolean;
  bleed?: boolean;
  tui: boolean;
  padding?: number;
  decor?: boolean;
}): { className: string; style?: CSSProperties; pad?: number } {
  const { box, studio, compact, bleed, tui, padding, decor } = o;
  const out = (className: string, px: number, style?: CSSProperties) => ({ className, ...(style ? { style } : null), ...(decor ? { pad: px } : null) });
  if (bleed && !compact && !studio) return out("", 0);
  if (padding !== undefined) return out("", padding, { padding });
  if (studio) return box.h < 100 || (box.w / box.h >= 2.6 && box.h < 130) ? out("px-3 py-0", 0) : out("px-3 py-2.5", 10);
  if (tui) return out(compact ? "px-[14px] pb-3 pt-[16px]" : "px-[14px] pb-[12px] pt-[16px]", 12);
  if (compact)
    return box.shape === "strip" && box.h < 130 ? out("px-4 py-2.5", 10) : box.w < 132 || box.h < 132 ? out("p-2.5", 10) : out("p-3", 12);
  const px = pickBy(box.size, { xs: 10, sm: 12, md: 16, lg: 20 });
  return out(pickBy(box.size, { xs: "p-2.5", sm: "p-3", md: "p-4", lg: "p-5" }), px);
}

/**
 * The body's flags for the standard alignment and gap (the `[data-wp-body]` rules in
 * `src/index.css`): each is set only while its option is not "Auto", so those rules — which reach
 * into the template's own layout, where no `var()` fallback can know the template's value — never
 * match by default. `data-wp-x` carries the choice, as "Spread" also distributes column layouts.
 */
export function bodyFlags(chrome: ModernChrome | undefined): Record<string, string> {
  const f: Record<string, string> = {};
  if (chrome?.alignX && chrome.alignX !== "auto") f["data-wp-x"] = chrome.alignX;
  if (chrome?.alignY && chrome.alignY !== "auto") f["data-wp-y"] = chrome.alignY;
  if (chrome?.gap !== undefined) f["data-wp-gap"] = "";
  return f;
}

/** The share of the body one look gap may take at most (the `[data-wp-gap]` rule's `min(…, 6%)`). */
export const GAP_CAP = 0.06;

/**
 * The gap a template that sizes or counts its own items must use: the look's gap, capped at
 * `GAP_CAP` of the room along that axis like the CSS rule, else the template's own `def`.
 */
export function bodyGap(look: ModuleSettings | undefined, def: number, room: number): number {
  const gap = look ? chromeOf(look).gap : undefined;
  return gap === undefined ? def : Math.min(gap, room * GAP_CAP);
}
