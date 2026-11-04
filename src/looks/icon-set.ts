// A pack's icon set as JSON (P9b, D26): `{ "<icon name>": { "viewBox": "0 0 24 24", "d": "<path data>" } }`, one single-path glyph per
// name, painted in `currentColor` by the Icon resolver (P8a). Only the fixed name list (the Material Symbols names the widgets use,
// `MATERIAL_ICONS`) is accepted, and path data is numbers and path commands only, so a set cannot carry markup or a reference.
import { MATERIAL_ICONS } from "@/widgets/core/icons";
import type { IconGlyph } from "@/widgets/core/types";

export const ICON_SET_MAX = 128;
export const ICON_PATH_MAX = 2000;
export const ICON_SET_BYTES_MAX = 64_000;
const VIEW_BOX = /^-?\d+(\.\d+)? -?\d+(\.\d+)? \d+(\.\d+)? \d+(\.\d+)?$/;
/** A glyph's box is 1 to 512 on each side, and no number of its path is outside 2048 (or not finite). */
const VIEW_BOX_MAX = 512;
const PATH_NUMBER_MAX = 2048;
const PATH_NUMBER = /[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/gi;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;

/** Whether a viewBox is four finite numbers, a positive width and height up to `VIEW_BOX_MAX`, an origin within it. */
function viewBoxOk(viewBox: string): boolean {
  if (!VIEW_BOX.test(viewBox)) return false;
  const [x, y, w, h] = viewBox.split(" ").map(Number);
  return [x, y, w, h].every(Number.isFinite) && w >= 1 && h >= 1 && w <= VIEW_BOX_MAX && h <= VIEW_BOX_MAX && Math.abs(x) <= VIEW_BOX_MAX && Math.abs(y) <= VIEW_BOX_MAX;
}

/** What is wrong with an icon set, one line each (empty = it may load). */
export function iconSetIssues(set: unknown): string[] {
  if (typeof set !== "object" || set === null || Array.isArray(set)) return ["icon set is not an object"];
  const entries = Object.entries(set);
  const issues: string[] = [];
  if (entries.length > ICON_SET_MAX) issues.push(`icon set has ${entries.length} icons, at most ${ICON_SET_MAX}`);
  let bytes = 0;
  for (const [name, glyph] of entries) {
    const g = glyph as Partial<IconGlyph> | null;
    if (!Object.hasOwn(MATERIAL_ICONS, name)) issues.push(`icon ${name} is not on the icon name list`);
    else if (typeof g !== "object" || g === null || typeof g.viewBox !== "string" || typeof g.d !== "string") issues.push(`icon ${name} needs viewBox and d`);
    else if (Object.keys(g).some((k) => k !== "viewBox" && k !== "d")) issues.push(`icon ${name} has a key other than viewBox and d`);
    else if (!viewBoxOk(g.viewBox)) issues.push(`icon ${name} viewBox: four numbers, a width and height of 1 to ${VIEW_BOX_MAX}`);
    else if (g.d.length > ICON_PATH_MAX) issues.push(`icon ${name} path is over ${ICON_PATH_MAX} characters`);
    else if (!PATH_DATA.test(g.d)) issues.push(`icon ${name} path has characters other than path data`);
    else if ((g.d.match(PATH_NUMBER) ?? []).some((n) => !Number.isFinite(Number(n)) || Math.abs(Number(n)) > PATH_NUMBER_MAX)) issues.push(`icon ${name} path has a number over ${PATH_NUMBER_MAX} or not finite`);
    else bytes += g.d.length;
  }
  if (bytes > ICON_SET_BYTES_MAX) issues.push(`icon set is over ${ICON_SET_BYTES_MAX} characters of path data`);
  return issues;
}

/** An icon set read from its JSON text; undefined when it is not JSON or has any issue (refused whole, like a pack). */
export function parseIconSet(text: string): Record<string, IconGlyph> | undefined {
  try {
    const set: unknown = JSON.parse(text);
    return iconSetIssues(set).length === 0 ? (set as Record<string, IconGlyph>) : undefined;
  } catch {
    return undefined;
  }
}
