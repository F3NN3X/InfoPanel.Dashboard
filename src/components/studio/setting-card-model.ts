import { settingKeys, type ModuleSetting, type ModuleSettings } from "@/modules/types";
import type { StyleSource } from "@/lib/style-resolve";
import type { InspectorCategory } from "./inspector-categories";
import { settingStateOf, type SettingState } from "./settings-model";

/** States whose value is set on the widget itself (so it can be reset there). */
const OWN_STATES: ReadonlySet<SettingState> = new Set(["own", "override"]);

/**
 * The settings of a card with a value of their own on the widget (not
 * inherited, not at the default). Locked ones (the widget follows the
 * global style) never count: they can't be edited or reset.
 */
export function changedDefs(
  defs: ModuleSetting[],
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined,
  inheritedFrom?: Record<string, StyleSource>,
  locked?: (def: ModuleSetting) => boolean
): ModuleSetting[] {
  return defs.filter(
    (d) => !locked?.(d) && OWN_STATES.has(settingStateOf(d, own, inherited, inheritedFrom))
  );
}

/** The stored keys a card's Reset drops (every key of its changed settings). */
export function resetKeysOf(
  defs: ModuleSetting[],
  own: ModuleSettings | undefined,
  inherited: ModuleSettings | undefined,
  inheritedFrom?: Record<string, StyleSource>,
  locked?: (def: ModuleSetting) => boolean
): string[] {
  return changedDefs(defs, own, inherited, inheritedFrom, locked).flatMap(settingKeys);
}

/** Longest label that still reads in half a card. */
const SHORT_LABEL = 12;

/** Small enough to share a line with a neighbour: a short-labelled toggle. */
function isSmall(def: ModuleSetting): boolean {
  return def.type === "boolean" && def.label.length <= SHORT_LABEL;
}

/** Rows in display order, neighbouring small ones (toggles) paired for a 2-up line. */
export function pairRows(defs: ModuleSetting[]): ModuleSetting[][] {
  const rows: ModuleSetting[][] = [];
  for (const def of defs) {
    const last = rows.at(-1);
    if (last && last.length === 1 && isSmall(last[0]) && isSmall(def)) rows[rows.length - 1] = [...last, def];
    else rows.push([def]);
  }
  return rows;
}

export interface NavItem {
  id: string;
  title: string;
  changed: number;
}

export interface NavSection {
  /** "general" or "module". */
  id: string;
  title: string;
  items: NavItem[];
}

/**
 * The dock's category list: the General header with its categories, then
 * the widget's own under its name (omitted when it has none). `changed`
 * is the per-category count shown beside each entry.
 */
export function navSections(
  categories: InspectorCategory[],
  changed: Readonly<Record<string, number>>,
  moduleTitle: string,
  generalTitle = "General"
): NavSection[] {
  const section = (id: string, title: string, general: boolean): NavSection => ({
    id,
    title,
    items: categories
      .filter((c) => c.general === general)
      .map((c) => ({ id: c.id, title: c.title, changed: changed[c.id] ?? 0 })),
  });
  return [section("general", generalTitle, true), section("module", moduleTitle, false)].filter(
    (s) => s.items.length > 0
  );
}
