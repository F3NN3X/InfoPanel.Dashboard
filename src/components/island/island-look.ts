import type { CSSProperties } from "react";
import type { IslandConfig, IslandWeight } from "@/lib/island/config";
import type { ResolvedGeneral } from "@/lib/general";
import { fontStack } from "@/lib/general";
import type { FontId } from "@/lib/fonts";
import { springCss, springFor, SPRINGS, type SpringKind } from "@/lib/island/spring";

const WEIGHTS: Record<IslandWeight, number> = { regular: 400, medium: 500, semibold: 600, bold: 700 };
const SHADOW = "0 6px 24px -6px rgb(0 0 0 / 0.55)";

/** The pill's colours, border, shadow and type from the island's settings. */
export interface IslandSkin {
  /** The fill, also the notch's corner pieces. */
  background: string;
  color: string;
  border?: string;
  boxShadow: string;
  backdropFilter?: string;
  fontFamily?: string;
  fontWeight: number;
}

export function islandSkin(c: Pick<IslandConfig, "tint" | "bgColor" | "fgColor" | "opacity" | "border" | "shadow" | "font" | "weight">): IslandSkin {
  const base = c.tint === "custom" ? c.bgColor : c.tint === "theme" ? "hsl(var(--card))" : "#000000";
  const color = c.tint === "custom" ? c.fgColor : c.tint === "theme" ? "hsl(var(--card-foreground))" : "#ffffff";
  const see = c.opacity < 100;
  // The theme tint always had the card's border; "none" keeps it so saved islands look the same.
  const border =
    c.border === "accent"
      ? "1px solid hsl(var(--primary))"
      : c.border === "subtle"
        ? `1px solid color-mix(in srgb, ${color} 16%, transparent)`
        : c.tint === "theme"
          ? "1px solid hsl(var(--border))"
          : undefined;
  return {
    background: see ? `color-mix(in srgb, ${base} ${c.opacity}%, transparent)` : base,
    color,
    border,
    boxShadow: c.shadow ? SHADOW : "none",
    backdropFilter: see ? "blur(14px) saturate(1.4)" : undefined,
    fontFamily: c.font === "system" ? undefined : fontStack(c.font as FontId),
    fontWeight: WEIGHTS[c.weight],
  };
}

/** The general clock settings with the island's own seconds and 12/24 h choice over them. */
export function islandClock(g: ResolvedGeneral, c: Pick<IslandConfig, "seconds" | "hours">): ResolvedGeneral {
  return {
    ...g,
    showSeconds: c.seconds === "general" ? g.showSeconds : c.seconds === "show",
    hour12: c.hours === "general" ? g.hour12 : c.hours === "12",
  };
}

const cache = new Map<string, { easing: string; ms: number }>();

/**
 * The spring a change of mode takes, as a CSS easing and duration: open, close or morph ("smooth"
 * drops the bounce), stretched by `slow`. Null = no animation (motion off, or reduced motion).
 */
export function shapeSpring(from: string | null, to: string, motion: IslandConfig["motion"], reduced: boolean, slow = 1): { easing: string; ms: number } | null {
  if (motion === "off" || reduced) return null;
  const kind: SpringKind = springFor(from, to);
  const id = `${kind}:${motion}:${slow}`;
  let css = cache.get(id);
  if (!css) {
    const spring = SPRINGS[kind];
    css = springCss(motion === "smooth" ? { ...spring, bounce: 0 } : spring, slow);
    cache.set(id, css);
  }
  return css;
}

/** A CSS `transition` moving `props` on the spring (none without one). */
export const springTransition = (spring: { easing: string; ms: number } | null, props: readonly string[]): string | undefined =>
  spring ? props.map((p) => `${p} ${spring.ms}ms ${spring.easing}`).join(", ") : undefined;

/** The shadow eases in on its own curve (L4 NotchBar: 0.3 s). */
export const shadowTransition = (slow: number): string => `box-shadow ${Math.round(300 * slow)}ms cubic-bezier(0.23, 1, 0.32, 1)`;

/** The CSS custom properties the content animations read (enter / exit timing, stretched by `slow`). */
export const motionVars = (slow: number): CSSProperties =>
  ({ "--island-enter": `${Math.round(240 * slow)}ms`, "--island-enter-delay": `${Math.round(50 * slow)}ms`, "--island-exit": `${Math.round(120 * slow)}ms` }) as CSSProperties;
