// A pack's icon set as JSON (P9b, D26): `{ "<icon name>": { "viewBox": "0 0 24 24", "d": "<path data>" } }`, one single-path glyph per
// name, painted in `currentColor` by the Icon resolver (P8a). Only the fixed name list (the Material Symbols names the widgets use,
// `MATERIAL_ICONS`) is accepted, and path data is numbers and path commands only, so a set cannot carry markup or a reference.
import { MATERIAL_ICONS } from "@/widgets/core/icons";
import type { IconGlyph } from "@/widgets/core/types";

export const ICON_SET_MAX = 128;
export const ICON_PATH_MAX = 2000;
export const ICON_SET_BYTES_MAX = 64_000;
const VIEW_BOX = /^0 0 \d{1,3} \d{1,3}$/;
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE.,\s+-]+$/;

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
    else if (!VIEW_BOX.test(g.viewBox)) issues.push(`icon ${name} viewBox`);
    else if (g.d.length > ICON_PATH_MAX) issues.push(`icon ${name} path is over ${ICON_PATH_MAX} characters`);
    else if (!PATH_DATA.test(g.d)) issues.push(`icon ${name} path has characters other than path data`);
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
