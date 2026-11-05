// CSS colours as a pack writes them: read to channels and alpha, and laid over a card. One reader for the validator (contrast per card)
// and the chrome (the text the panels and the page draw), so a colour is the same colour in both.

export interface Colour {
  /** `#rrggbb` when the colour is a literal (hex, `rgb()` or `hsl()`). */
  hex?: string;
  alpha: number;
}

export const byte = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");

/** `hsl()` as 0-255 channels. */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + (((h % 360) + 360) % 360) / 30) % 12;
  const a = (Math.min(Math.max(s, 0), 100) / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n: number) => (l / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255;
  return [f(0), f(8), f(4)];
}

/** A CSS colour as written: hex (3, 4, 6, 8 digits), `rgb()`/`rgba()`, `hsl()`/`hsla()`, `transparent`; undefined for anything else (a name, `var()`, `oklch()`, `color-mix()`): the caller refuses what it cannot read. */
export function parseColour(value: string): Colour | undefined {
  const v = value.trim().toLowerCase();
  if (v === "transparent") return { alpha: 0 };
  const hex = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.exec(v)?.[1];
  if (hex) {
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join("") : hex;
    return { hex: `#${full.slice(0, 6)}`, alpha: full.length === 8 ? parseInt(full.slice(6), 16) / 255 : 1 };
  }
  const fn = /^(rgba?|hsla?)\(([^)]*)\)$/.exec(v);
  if (!fn) return undefined;
  const parts = fn[2].split(/[\s,/]+/).filter(Boolean);
  const a = parts[3];
  const alpha = a === undefined ? 1 : a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
  if (!Number.isFinite(alpha) || parts.length < 3 || parts.length > 4) return undefined;
  const channels = parts.slice(0, 3).map((p) => parseFloat(p));
  if (!channels.every(Number.isFinite)) return undefined;
  // parseFloat drops a unit: 0.5turn would read as half a degree, so a hue with a unit other than deg is not read
  if (fn[1].startsWith("hsl") && !/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?(deg)?$/.test(parts[0])) return undefined;
  const [r, g, b] = fn[1].startsWith("hsl") ? hslToRgb(channels[0], channels[1], channels[2]) : parts.slice(0, 3).map((p, k) => (p.endsWith("%") ? (channels[k] * 255) / 100 : channels[k]));
  return { hex: `#${byte(r)}${byte(g)}${byte(b)}`, alpha: Math.max(0, Math.min(1, alpha)) };
}

/** A colour laid over `under` at `alpha` (0-1), as `#rrggbb`. */
export function over(hex: string, alpha: number, under: string): string {
  const [a, b] = [hex, under].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  return `#${a.map((c, k) => byte(c * alpha + b[k] * (1 - alpha))).join("")}`;
}

/** A colour as `#rrggbb`: a hex stays as written, `rgb()`/`hsl()` become hex, and an alpha is laid over `under` (the card it is drawn on, any colour `parseColour` reads); anything unreadable, `under` included, is returned as it is. */
export function flatOver(value: string, under: string): string {
  if (/^#[\da-f]{6}$/i.test(value)) return value;
  const c = parseColour(value);
  if (!c?.hex) return value;
  if (c.alpha >= 1) return c.hex;
  const base = parseColour(under)?.hex;
  return base ? over(c.hex, c.alpha, base) : value;
}
