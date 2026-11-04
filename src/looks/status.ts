// The status colours: one source for the widgets' STATE and TONES, their light and theme text variants, the gauge
// export, the audiocn fallbacks and the other places that paint a good, warning or critical reading.
export const STATUS = {
  ok: "#3CC97F",
  warn: "#EDB232",
  crit: "#F2665E",
  /** The track behind a status colour. */
  none: "rgba(255,255,255,0.07)",
} as const;

/** Ok, warn and crit text on a light surface, darkened to keep contrast (4.5:1 on `LIGHT_FILL`). */
export const STATUS_LIGHT = { ok: "#15803d", warn: "#a15c07", crit: "#c4261d" } as const;

/** The status colours per mode (D3, D27): what a Look's T1 `ok`, `warn` and `crit` hold for each mode it supports. */
export const STATUS_MODE = { dark: STATUS, light: STATUS_LIGHT } as const;

/** The colour light cards draw on (`--w-fill`), the ground `accentInk` darkens against. */
export const LIGHT_FILL = "#f4f4f5";
const INK = [24, 24, 27] as const;

const rgbOf = (hex: string): number[] | undefined => {
  const m = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const s = m[1].length === 3 ? [...m[1]].map((c) => c + c).join("") : m[1];
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
};
const lum = (c: readonly number[]): number => {
  const [r, g, b] = c.map((v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** WCAG contrast of two `#rgb` / `#rrggbb` colours (undefined for any other CSS colour). */
export function contrastOf(a: string, b: string): number | undefined {
  const x = rgbOf(a);
  const y = rgbOf(b);
  if (!x || !y) return undefined;
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The accent as text or a thin line on a light card (D27 `accent-ink`): the accent itself when it holds `min` against
 * `fill`, else mixed toward the ink in 4 % steps until it does. A colour that is not a hex is returned as it is.
 */
export function accentInk(accent: string, fill: string = LIGHT_FILL, min = 4.5): string {
  const c = rgbOf(accent);
  if (!c || (contrastOf(accent, fill) ?? min) >= min) return accent;
  for (let t = 0.04; t <= 1; t += 0.04) {
    const hex = `#${c.map((v, i) => Math.round(v + (INK[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
    if ((contrastOf(hex, fill) ?? 0) >= min) return hex;
  }
  return "#18181b";
}
