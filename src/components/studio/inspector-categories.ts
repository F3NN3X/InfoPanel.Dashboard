import {
  GROUP_ADVANCED,
  GROUP_COLORS,
  GROUP_EFFECTS,
  GROUP_LOOK,
  GROUP_SIZE,
  GROUP_SPACING,
  GROUP_TYPOGRAPHY,
  GROUP_WIDGET,
} from "@/modules/standard-settings";
import { isDeviceKind, type InspectorTab, type ModuleSetting } from "@/modules/types";
import { matchesQuery, rowMatches } from "./settings-model";

/** A general category: the same for every widget, panel and blank zone. */
interface GeneralCategory {
  id: string;
  /** Also the `group` of the standard settings filed in it. */
  title: string;
  hint: string;
  /** The inspector tab it sits in (Content for the Widget card, Style for the look). */
  tab: InspectorTab;
  /** Only shown with "Advanced settings" on. */
  advanced?: boolean;
  /**
   * The standard setting keys it holds (an "align" picker counts once, by
   * its horizontal key). Ungrouped keys (`preset`, `layout`, `surface`)
   * are filed by this list; the others agree with their `group`.
   *
   * Judgement calls: `layout` is a size decision (card / compact / ...), so
   * it sits in Size & alignment; `preset` and `surface` are the surface
   * choice, with the accent and background; `stroke` (ring / bar
   * thickness) is a shape; the text colors are Typography, not colors;
   * `surfaceOpacity` and `blur` belong to the surface.
   */
  keys: readonly string[];
}

/** The general categories, in the order the inspector shows them. */
export const GENERAL_CATEGORIES: readonly GeneralCategory[] = [
  {
    id: "widget",
    tab: "content",
    title: GROUP_WIDGET,
    hint: "Title, icon and visibility",
    keys: ["showTitle", "label", "icon"],
  },
  {
    id: "look",
    tab: "style",
    title: GROUP_LOOK,
    hint: "Skin, graph and meter style, graph updates",
    keys: ["skin", "graph", "meter", "smoothing"],
  },
  {
    id: "size",
    tab: "style",
    title: GROUP_SIZE,
    hint: "Layout, dense summary, summary card, scale and alignment in the zone",
    keys: ["layout", "variant", "compactView", "autoScale", "scale", "alignX"],
  },
  {
    id: "typography",
    tab: "style",
    title: GROUP_TYPOGRAPHY,
    hint: "Font, weight, case and text colors",
    keys: ["textColor", "mutedColor", "font", "fontWeight", "labelCase"],
  },
  {
    id: "spacing",
    tab: "style",
    title: GROUP_SPACING,
    hint: "Padding, gaps, corners and stroke thickness",
    keys: ["padding", "gap", "radius", "stroke"],
  },
  {
    id: "colors",
    tab: "style",
    title: GROUP_COLORS,
    hint: "Preset, surface, accent, background, opacity and blur",
    keys: ["preset", "surface", "accent", "background", "backgroundOn", "surfaceOpacity", "blur"],
  },
  {
    id: "effects",
    tab: "style",
    title: GROUP_EFFECTS,
    hint: "Border and edge glow",
    keys: ["borderWidth", "borderColor", "glow", "glowColor"],
  },
  {
    id: "advanced",
    tab: "style",
    advanced: true,
    title: GROUP_ADVANCED,
    hint: "Custom CSS",
    keys: ["customCss"],
  },
];

/**
 * Whether a widget's own category is made of color pickers only (Device
 * colors, Dot colors, Gauge colors, ...): those are look settings, filed
 * in Style and tucked away as advanced.
 */
const isColorCategory = (defs: ModuleSetting[]): boolean =>
  defs.length > 0 && defs.every((d) => d.type === "color");

/** Where settings that name no category (and no standard key) end up. */
export const OTHER_TITLE = "Other";

const GENERAL_BY_KEY: ReadonlyMap<string, GeneralCategory> = new Map(
  GENERAL_CATEGORIES.flatMap((c) => c.keys.map((key) => [key, c] as const))
);

export interface InspectorCategory {
  /** Stable, unique per sheet: the general id, or `module:` + the title. */
  id: string;
  title: string;
  hint?: string;
  /** One of the general categories (same on every widget). */
  general: boolean;
  defs: ModuleSetting[];
}

/** The title of the category a setting is filed in. */
export function categoryTitleOf(def: ModuleSetting): string {
  return GENERAL_BY_KEY.get(def.key)?.title ?? def.group ?? OTHER_TITLE;
}

const moduleId = (title: string) => `module:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

/**
 * A settings schema as ordered categories: the general ones first, in
 * their canonical order (only those that have settings), then the widget's
 * own in the order they first appear, then "Other" for anything unfiled.
 * Each category keeps its settings in schema order.
 */
export function categorize(defs: ModuleSetting[]): InspectorCategory[] {
  const general = new Map<string, InspectorCategory>();
  const own = new Map<string, InspectorCategory>();
  for (const def of defs) {
    const spec = GENERAL_BY_KEY.get(def.key);
    if (spec) {
      const cat = general.get(spec.id) ?? {
        id: spec.id,
        title: spec.title,
        hint: spec.hint,
        general: true,
        defs: [],
      };
      general.set(spec.id, { ...cat, defs: [...cat.defs, def] });
      continue;
    }
    const title = def.group ?? OTHER_TITLE;
    const cat = own.get(title) ?? { id: moduleId(title), title, general: false, defs: [] };
    own.set(title, { ...cat, defs: [...cat.defs, def] });
  }
  const other = own.get(OTHER_TITLE);
  return [
    ...GENERAL_CATEGORIES.flatMap((c) => general.get(c.id) ?? []),
    ...[...own.values()].filter((c) => c !== other),
    ...(other ? [other] : []),
  ];
}

/**
 * `categories` with the named general categories present: the ones the
 * zone adds cards to itself (the widget picker, the zone frame) exist even
 * when the schema files no setting in them. Canonical order is kept.
 */
export function withGeneral(categories: InspectorCategory[], ids: readonly string[]): InspectorCategory[] {
  const have = new Map(categories.filter((c) => c.general).map((c) => [c.id, c] as const));
  const general = GENERAL_CATEGORIES.flatMap((spec): InspectorCategory[] => {
    const present = have.get(spec.id);
    if (present) return [present];
    return ids.includes(spec.id)
      ? [{ id: spec.id, title: spec.title, hint: spec.hint, general: true, defs: [] }]
      : [];
  });
  return [...general, ...categories.filter((c) => !c.general)];
}

/**
 * Search over categories, with `filterSettings`' semantics: matching rows
 * (label, key, option, keyword) win and are returned in their categories;
 * only when no row matches does a category title count, returning all of
 * that category's settings. A blank query keeps everything.
 */
export function filterCategories(
  categories: InspectorCategory[],
  query: string
): InspectorCategory[] {
  if (query.trim() === "") return categories;
  const rows = categories
    .map((c) => ({ ...c, defs: c.defs.filter((d) => rowMatches(d, query)) }))
    .filter((c) => c.defs.length > 0);
  return rows.length > 0 ? rows : categories.filter((c) => matchesQuery([c.title], query));
}

const GENERAL_SPEC_BY_ID: ReadonlyMap<string, GeneralCategory> = new Map(
  GENERAL_CATEGORIES.map((c) => [c.id, c] as const)
);

/** The tab a category sits in (a setting's own `tab` can still move it, see `tabOf`). */
export function categoryTab(category: InspectorCategory): InspectorTab {
  if (category.general) return GENERAL_SPEC_BY_ID.get(category.id)?.tab ?? "style";
  return isColorCategory(category.defs) ? "style" : "content";
}

/** Whether a whole category is advanced (custom CSS, a widget's color categories). */
export function categoryAdvanced(category: InspectorCategory): boolean {
  if (category.general) return GENERAL_SPEC_BY_ID.get(category.id)?.advanced ?? false;
  return isColorCategory(category.defs);
}

/** Whether a setting binds data: a sensor, or a device picked from the live keys. */
export const isDataSetting = (def: ModuleSetting): boolean => def.type === "sensor" || isDeviceKind(def.optionsFrom);

/** The tab a setting sits in: its own `tab`, else Data for data settings, else its category's. */
export function tabOf(def: ModuleSetting, category: InspectorCategory): InspectorTab {
  return def.tab ?? (isDataSetting(def) ? "data" : categoryTab(category));
}

/** Whether a setting is advanced: flagged itself, or in an advanced category. */
export function isAdvanced(def: ModuleSetting, category: InspectorCategory): boolean {
  return def.advanced === true || categoryAdvanced(category);
}
