import type { Placement } from "@/lib/layout";
import type { ModuleSetting } from "@/modules/types";
import { pinsOf } from "./inspector/inspector-prefs";
import { sharedDefs } from "./inspector-model";
import { GENERAL_CATEGORIES } from "./inspector-categories";

/**
 * A widget type's default quick set (the quick bar before the user pins
 * anything): Layout and Accent when it has them, then its first two own
 * settings that fit a compact control (toggle, choice, number, colour).
 * Up to four keys. Pins replace it per type (`inspector-prefs`).
 */

/** Setting types the quick bar shows as a compact control. */
export const QUICK_TYPES: ReadonlySet<string> = new Set(["boolean", "select", "number", "color"]);

/** Standard settings without a group that are not quick picks (a preset bundle, the card surface). */
const NOT_QUICK = new Set(["preset", "surface"]);

const GENERAL_TITLES = new Set(GENERAL_CATEGORIES.map((c) => c.title));

/** Whether a setting can sit in the quick bar. */
export const quickable = (def: ModuleSetting): boolean => QUICK_TYPES.has(def.type) && !def.multiple && !def.keyY && !def.optionsFrom;

export function defaultQuickKeys(defs: readonly ModuleSetting[]): string[] {
  const has = (key: string) => defs.some((d) => d.key === key);
  const own = defs
    .filter(
      (d) =>
        quickable(d) &&
        !d.advanced &&
        !NOT_QUICK.has(d.key) &&
        d.key !== "layout" &&
        !(d.group && GENERAL_TITLES.has(d.group)) &&
        !(d.group === undefined && ["layout", "accent"].includes(d.key))
    )
    .slice(0, 2)
    .map((d) => d.key);
  return [...(has("layout") ? ["layout"] : []), ...(has("accent") ? ["accent"] : []), ...own].slice(0, 4);
}

/** The pins' key for a zone: its widget type, or one shared by every panel. */
export const pinTypeOf = (zone: Pick<Placement, "module" | "panel">): string => (zone.panel ? "panel" : zone.module);

/**
 * The settings the quick bar shows for a selection: each zone type's pins
 * (or its default set), only those every selected type pinned, in the first
 * zone's order, that exist on every selected zone and fit a compact control.
 */
export function quickDefsFor(
  zones: readonly Placement[],
  pins: Record<string, string[]>,
  defsOf: (zone: Placement) => ModuleSetting[]
): ModuleSetting[] {
  if (zones.length === 0) return [];
  const pinned = zones.map((z) => pinsOf(pins, pinTypeOf(z), defaultQuickKeys(defsOf(z))));
  const shared = sharedDefs(zones.map(defsOf));
  return pinned[0]
    .filter((key) => pinned.every((keys) => keys.includes(key)))
    .flatMap((key) => shared.filter((d) => d.key === key && quickable(d)));
}
