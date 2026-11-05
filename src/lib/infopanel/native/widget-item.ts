/**
 * A Studio widget on a Free page (one-editor SPEC §3.3): an InfoPanel `Image` item, its box, carrying the widget's
 * record under `$.widget` (import/stored.ts). It sits in the canvas's items, so z-order, groups, lock, hide, align and
 * snap are the canvas editor's own; the kiosk and the editor draw the registry widget at its box (native.tsx).
 */
import { defaultItem, type DisplayItem } from "../schema.ts";
import { isWidgetItem, widgetBox, widgetOf, type WidgetItem } from "../import/stored.ts";
import type { Rect } from "./items.ts";

export type { WidgetItem };
export { isWidgetItem, widgetBox, widgetOf };

/** A new widget item at `box` (px on the canvas), named `name`. */
export function newWidgetItem(widget: WidgetItem, box: Rect, name: string): DisplayItem {
  return {
    ...defaultItem("Image"),
    Name: name,
    X: Math.round(box.x),
    Y: Math.round(box.y),
    Width: Math.max(1, Math.round(box.w)),
    Height: Math.max(1, Math.round(box.h)),
    widget,
  } as DisplayItem;
}

/** A widget item moved onto cells: its box the cells' `box` (InfoPanel's X / Y / size), its record's `cell` set. */
export function widgetOnCell(item: DisplayItem, cell: NonNullable<WidgetItem["cell"]>, box: Rect): DisplayItem {
  const widget = widgetOf(item);
  if (!widget) return item;
  if (item.kind !== "Image") return item;
  return { ...item, X: Math.round(box.x), Y: Math.round(box.y), Width: Math.max(1, Math.round(box.w)), Height: Math.max(1, Math.round(box.h)), widget: { ...widget, cell } } as DisplayItem;
}

/** The item with its widget record replaced; any other item as it is. */
export function withWidget(item: DisplayItem, widget: WidgetItem): DisplayItem {
  return item.kind === "Image" ? ({ ...item, widget } as DisplayItem) : item;
}

/** Every widget item's path, in tree order (groups included). */
export function widgetPaths(items: readonly DisplayItem[], prefix = ""): string[] {
  return items.flatMap((item, i) => {
    const path = prefix ? `${prefix}.${i}` : String(i);
    if (isWidgetItem(item)) return [path];
    return item.kind === "Group" ? widgetPaths(item.DisplayItems, path) : [];
  });
}
