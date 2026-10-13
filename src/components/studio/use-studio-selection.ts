import { useEffect, useState } from "react";
import type { ProfileView, Placement } from "@/lib/layout";
import { nextSelection, type SelectMode } from "./selection";

/**
 * The zone selection (`selectedIds`, the last one is the primary zone the
 * toolbar and inspector show) and, apart from it, the selected widget of
 * a panel zone. The widget only counts while its zone is the one selected
 * zone and still holds it: changing the zone selection, an undo or a
 * delete drops it.
 */
export function useStudioSelection(profile: ProfileView) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [widgetSel, setWidgetSel] = useState<{ zoneId: string; widgetId: string } | null>(null);

  // Deselect when switching profiles.
  useEffect(() => setSelectedIds([]), [profile.id]);

  /** The selected zones that still exist, the primary last. */
  const selection = selectedIds
    .map((id) => profile.placements.find((p) => p.id === id))
    .filter((p): p is Placement => p !== undefined);
  const selected = selection.at(-1) ?? null;
  const primaryId = selected?.id ?? null;

  // An undo/redo (or any edit) can remove selected zones: drop them.
  const stale = selection.length !== selectedIds.length;
  useEffect(() => {
    if (stale) setSelectedIds(selection.map((p) => p.id));
  }, [stale]);

  const selectedWidget =
    (widgetSel &&
      selection.length === 1 &&
      widgetSel.zoneId === primaryId &&
      selected?.panel?.widgets.find((w) => w.id === widgetSel.widgetId)) ||
    null;
  const selectedWidgetId = selectedWidget?.id ?? null;
  useEffect(() => {
    if (widgetSel !== null && !selectedWidget) setWidgetSel(null);
  }, [widgetSel, selectedWidget]);

  /** Select a zone (see `SelectMode`); null clears the selection. */
  const select = (id: string | null, mode: SelectMode = "only") =>
    setSelectedIds((ids) => (id === null ? [] : nextSelection(ids, id, mode)));

  /** Every zone of the profile; the primary zone stays primary. */
  const selectAll = () =>
    setSelectedIds((ids) => {
      const primary = ids.at(-1);
      const all = profile.placements.map((p) => p.id).filter((id) => id !== primary);
      return primary !== undefined && profile.placements.some((p) => p.id === primary) ? [...all, primary] : all;
    });

  /** Select a zone's widget (null = the panel itself). */
  const selectWidget = (zoneId: string, widgetId: string | null) => {
    setSelectedIds([zoneId]);
    setWidgetSel(widgetId === null ? null : { zoneId, widgetId });
  };

  return {
    selectedIds: selection.map((p) => p.id),
    selection,
    selected,
    primaryId,
    selectedWidget,
    selectedWidgetId,
    select,
    selectAll,
    /** Select exactly these zones (the last one primary). */
    selectMany: (ids: string[]) => setSelectedIds(ids),
    selectWidget,
    clearWidget: () => setWidgetSel(null),
  };
}

export type StudioSelection = ReturnType<typeof useStudioSelection>;
