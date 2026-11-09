import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DashboardConfig } from "@/lib/layout";
import { addCatalog, sameDrop, type AddItem } from "./add-catalog";
import type { Ghost } from "./add-place";
import { useRecentAdds } from "./add-recent";
import type { AddToastState } from "./add-toast";
import type { LibraryItem } from "./drop-ghost";
import type { AddOutcome } from "./use-studio-mutations";
import { useWidgetPresets } from "./widget-presets";
import { useRecipeItems } from "@/widgets/recipe/use-recipes";
import type { ZoneRect } from "./zone-geometry";

/** How long the Add panel's toast stays up. */
export const ADD_TOAST_MS = 4000;

/**
 * The Add toast's state (Edit v3 SPEC §9.6): `show` raises it for a while; it goes as soon as another edit lands after
 * an add, since its Undo would then undo that edit instead. `changes` is what edits change (the config, the canvas's items).
 */
export function useAddToast(changes: unknown) {
  const [toast, setToast] = useState<AddToastState | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const ownChange = useRef(false);
  useEffect(() => {
    if (ownChange.current) {
      ownChange.current = false;
      return;
    }
    setToast((t) => (t?.added ? null : t));
  }, [changes]);
  /** Raise the toast; an add's (`added`) is expected to change `changes` once, which keeps it. */
  const show = useCallback((message: string, added: boolean) => {
    clearTimeout(timer.current);
    if (added) ownChange.current = true;
    setToast({ id: ++seq.current, message, added });
    timer.current = setTimeout(() => setToast(null), ADD_TOAST_MS);
  }, []);
  return { toast, show, seq, clear: () => setToast(null) };
}

interface AddPanelDeps {
  config: DashboardConfig;
  /** The one add path (`useStudioMutations().addFromPanel`). */
  addFromPanel: (item: AddItem, spot?: { zoneId: string } | { rect: ZoneRect }) => AddOutcome | null;
  /** The selected blank zone a click fills. */
  targetZoneId?: string;
  /** The studio's undo (the toast's Undo). */
  undo: () => void;
}

/**
 * The Add panel's state shared with the canvas (handoff SPEC §7): the catalog, Recently used, the toast and the added
 * zone's flash, and `add` for a click, Enter or a drop. Each add is one undo step.
 */
export function useAddPanel({ config, addFromPanel, targetZoneId, undo }: AddPanelDeps) {
  const builtin = useWidgetPresets();
  const recipes = useRecipeItems();
  const catalog = useMemo(
    () => addCatalog(config.panelPresets, builtin, config.widgetPresets, recipes),
    [config.panelPresets, config.widgetPresets, builtin, recipes]
  );
  const [recent, pushRecent] = useRecentAdds();
  const { toast, show, seq, clear } = useAddToast(config);
  const [flash, setFlash] = useState<{ zoneId: string; seq: number } | null>(null);

  const finish = (item: AddItem, outcome: AddOutcome | null) => {
    if (!outcome) return;
    if (!outcome.added) return show(outcome.message, false);
    if (item.kind === "widget") pushRecent(item.id);
    setFlash({ zoneId: outcome.zoneId, seq: seq.current + 1 });
    show(outcome.message, true);
  };

  /** A click or Enter: fills the target when one is set, else auto-places. */
  const add = (item: AddItem) => finish(item, addFromPanel(item, targetZoneId ? { zoneId: targetZoneId } : undefined));

  /** A drop on a valid ghost: fills the blank zone under it, or places at its box. */
  const drop = (item: AddItem, ghost: Ghost) =>
    finish(item, addFromPanel(item, ghost.kind === "fill" ? { zoneId: ghost.zoneId } : { rect: ghost.rect }));

  /** The row a canvas drag carries. */
  const itemOf = useCallback(
    (d: LibraryItem): AddItem | undefined =>
      [...catalog.widget, ...catalog.panel, ...catalog.layout].find((i) => sameDrop(i.drop, d)),
    [catalog]
  );

  const undoAdd = () => {
    clear();
    undo();
  };

  return { catalog, recent, pushRecent, toast, show, flash, add, drop, itemOf, undoAdd };
}

export type AddPanelState = ReturnType<typeof useAddPanel>;
