import { useCallback, useEffect, useRef } from "react";
import { useDismissToast, useToast } from "@/components/ui/toast";
import type { HistorySetter } from "@/hooks/use-config-history";

/** Edits that follow each other within this many ms (a slider, typing) are one toast. */
const SETTLE_MS = 500;
/** How long the toast with Undo stays up. */
const UNDO_TOAST_MS = 6000;

/** What the toast reads of the config history: the revision now, and as state so a later step is noticed. */
export interface HistoryRevision {
  revision: number;
  currentRevision: () => number;
}

/**
 * A workspace page's config setter that also raises a result toast with Undo once the edits settle. Undo is the studio's
 * own (Ctrl+Z), so the step it reverts is the one the history recorded; nothing is added to what the history saves.
 * The toast names that step by the history's revision: an edit that changed nothing raises none, and the toast goes
 * (and its Undo with it) when another step lands, the server copy replaces the history, or the area (`area`) changes.
 */
export function useUndoToast(set: HistorySetter, undo: () => void, message: string, history: HistoryRevision, area: string): HistorySetter {
  const toast = useToast();
  const dismiss = useDismissToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The step the pending or shown toast is for, and the toast itself once it is up.
  const named = useRef<{ revision: number; toastId: number | null } | null>(null);
  // The newest callbacks, so a toast raised after the delay never calls a stale undo.
  const latest = useRef({ toast, dismiss, undo, message, currentRevision: history.currentRevision });
  latest.current = { toast, dismiss, undo, message, currentRevision: history.currentRevision };

  const clear = useCallback(() => {
    clearTimeout(timer.current);
    const step = named.current;
    named.current = null;
    if (step?.toastId != null) latest.current.dismiss(step.toastId);
  }, []);

  // A newer step, an undo or the history replaced, or another area: the toast is no longer about the last step.
  useEffect(() => {
    if (named.current && named.current.revision !== history.revision) clear();
  }, [history.revision, clear]);
  useEffect(() => clear, [area, clear]);

  return useCallback<HistorySetter>(
    (action, key) => {
      const before = latest.current.currentRevision();
      set(action, key);
      const revision = latest.current.currentRevision();
      // The setter records nothing when the edit leaves the config as it was.
      if (revision === before) return;
      clear();
      named.current = { revision, toastId: null };
      timer.current = setTimeout(() => {
        const now = latest.current;
        const step = named.current;
        if (!step || step.revision !== now.currentRevision()) return;
        step.toastId = now.toast(now.message, {
          action: {
            label: "Undo",
            onClick: () => {
              if (named.current === step && step.revision === latest.current.currentRevision()) latest.current.undo();
            },
          },
          ms: UNDO_TOAST_MS,
        });
      }, SETTLE_MS);
    },
    [set, clear]
  );
}
