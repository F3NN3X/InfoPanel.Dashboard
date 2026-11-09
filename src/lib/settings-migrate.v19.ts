// Config v19 (the widget merges, _docs/widgets/MERGES.md): a placement of a widget that merged into another becomes the
// survivor in the matching view, its settings mapped. In a module of its own so only an older config's load, and an
// imported file's, carries it (config-upgrade.ts); the Widget QA page reads the table to draw the merged-away ids.
import type { ModuleSettings } from "@/modules/types";

/** One merge: the merged-away id, the survivor and the view it becomes, and its stored settings as the survivor's. */
export interface WidgetMerge {
  from: string;
  to: string;
  view: string;
  /**
   * The old widget's stored settings as the survivor's: the view and the settings the view brings written (so its View
   * row does not read Custom), renamed keys moved, and an old default written where the survivor's differs. Frozen: it
   * never follows a later change of the survivor's meta. Every other key stays.
   */
  settings: (s: ModuleSettings) => ModuleSettings;
}

/** The approved merges, one row each (MERGES.md M1, ...). */
export const WIDGET_MERGES: readonly WidgetMerge[] = [
  // M1: Forecast is Weather's forecast view. Its `days` (0 = as many as fit, the default) is Weather's `forecastDays`,
  // whose own default is 5: a Forecast that stored none gets 0.
  {
    from: "Forecast",
    to: "Weather",
    view: "forecast",
    settings: ({ days, ...s }) => ({ ...s, view: "forecast", showForecast: true, showStats: false, showFeels: false, forecastDays: days ?? 0 }),
  },
];

const BY_ID: ReadonlyMap<string, WidgetMerge> = new Map(WIDGET_MERGES.map((m) => [m.from, m]));

interface MergeablePlacement {
  module: string;
  settings?: ModuleSettings;
  canvas?: unknown;
}

/** A stored widget (a placement, or a canvas's `$.widget`) as its survivor's; the same object when its id did not merge. */
function widgetV19<W extends { module: string; settings?: ModuleSettings }>(w: W): W {
  const m = BY_ID.get(w.module);
  return m ? { ...w, module: m.to, settings: m.settings(w.settings ?? {}) } : w;
}

/** A canvas item list with each Studio widget (an Image item's `$.widget`, groups included) migrated; the same list when none changes. */
function itemsV19(items: unknown): unknown {
  if (!Array.isArray(items)) return items;
  const next = items.map((item) => {
    if (!item || typeof item !== "object") return item;
    const o = item as { kind?: unknown; $?: { widget?: unknown }; DisplayItems?: unknown };
    const w = o.$?.widget as { module?: unknown } | undefined;
    const widget = o.kind === "Image" && w && typeof w === "object" && typeof w.module === "string" ? widgetV19(w as { module: string }) : w;
    const children = itemsV19(o.DisplayItems);
    if (widget === w && children === o.DisplayItems) return item;
    return { ...o, ...(widget !== w ? { $: { ...o.$, widget } } : {}), ...(children !== o.DisplayItems ? { DisplayItems: children } : {}) };
  });
  return next.every((x, i) => x === items[i]) ? items : next;
}

/**
 * v19, per placement and keyed on the id (never the version, so an old id in an imported file, a profile file or a pasted
 * screen maps the same): a merged-away widget becomes its survivor (`WIDGET_MERGES`), and so does one an inline canvas
 * holds. The id, box, visibility, design, follow flags, lock, name and every other key stay.
 */
export function migratePlacementV19<P extends MergeablePlacement>(p: P): P {
  const placed = widgetV19(p);
  const canvas = p.canvas as { items?: unknown } | undefined;
  if (!canvas || typeof canvas !== "object") return placed;
  const items = itemsV19(canvas.items);
  return items === canvas.items ? placed : { ...placed, canvas: { ...canvas, items } };
}

/** v19 for one profile: its zones (`migrateMergedWidgetsV19` in config-upgrade.ts). */
export function migrateMergedWidgetsV19<Pr extends { pages: { placements: MergeablePlacement[] }[] }>(p: Pr): Pr {
  const pages = p.pages.map((pg) => {
    const placements = pg.placements.map(migratePlacementV19);
    return placements.every((pl, i) => pl === pg.placements[i]) ? pg : { ...pg, placements };
  });
  return pages.every((pg, i) => pg === p.pages[i]) ? p : { ...p, pages };
}
