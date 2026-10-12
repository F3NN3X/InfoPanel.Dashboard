// Low-level colour tokens shared by surfaces, skins and primitives (no React, no imports).
// Accent colour-mix: mix(30) → color-mix(in oklab, var(--accent) 30%, transparent)
export const mix = (p: number, to = "transparent"): string => `color-mix(in oklab, var(--accent) ${p}%, ${to})`;
// Accent-derived hue series: hue(70) → the accent rotated 70° in OKLCH (secondary series)
export const hue = (deg: number): string => (deg ? `oklch(from var(--accent) l c calc(h + ${deg}))` : "var(--accent)");
