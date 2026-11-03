// A widget's card as the InfoPanel export draws it. Its own module with no imports, so the QA page can load it for the
// material export check (tests/e2e/material-export.spec.ts) without pulling the converter into another chunk.

/** A computed colour, "rgb(r, g, b)" / "rgba(r, g, b, a)" / "color(srgb r g b / a)" / "#RRGGBB", as `#AARRGGBB`; "" for anything else. */
export function rgbToArgb(css: string): string {
  if (/^#[0-9a-f]{6}$/i.test(css.trim())) return `#FF${css.trim().slice(1)}`.toUpperCase();
  const hex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
  const alpha = (a: string | undefined) => (a === undefined ? 1 : a.endsWith("%") ? parseFloat(a) / 100 : Number(a));
  // A color-mix() in srgb computes to `color(srgb r g b / a)`, channels 0 to 1.
  const s = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/.exec(css.trim());
  if (s) return `#${hex(alpha(s[4]) * 255)}${hex(Number(s[1]) * 255)}${hex(Number(s[2]) * 255)}${hex(Number(s[3]) * 255)}`.toUpperCase();
  const m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(css.trim());
  return m ? `#${hex(alpha(m[4]) * 255)}${hex(Number(m[1]))}${hex(Number(m[2]))}${hex(Number(m[3]))}`.toUpperCase() : "";
}

/** A colour InfoPanel can draw: `#AARRGGBB` and not fully see-through. */
const drawn = (color: string): boolean => /^#[0-9A-F]{8}$/.test(color) && !color.startsWith("#00");

/** The material's export colour (`--w-mat-export`) as the browser resolves it, through a probe's `color`; "" when the root sets none. */
function exportColor(root: HTMLElement): string {
  if (!getComputedStyle(root).getPropertyValue("--w-mat-export").trim()) return "";
  const probe = document.createElement("i");
  probe.style.color = "var(--w-mat-export)";
  root.append(probe);
  const color = getComputedStyle(probe).color;
  probe.remove();
  return color;
}

/**
 * A widget's surface as InfoPanel draws a card: its colour (`#AARRGGBB`) and corner radius; null when it is see-through.
 * A card whose background is a gradient or a pattern has no background colour: it exports its material's flat colour.
 */
export function surfaceOf(zone: HTMLElement, zoom = 1): { color: string; radius: number } | null {
  const root = zone.querySelector<HTMLElement>("[data-wp-tier]");
  if (!root) return null;
  const style = getComputedStyle(root);
  const own = rgbToArgb(style.backgroundColor);
  const color = drawn(own) ? own : rgbToArgb(exportColor(root));
  if (!drawn(color)) return null;
  return { color, radius: Math.round((parseFloat(style.borderTopLeftRadius) || 0) / zoom) };
}
