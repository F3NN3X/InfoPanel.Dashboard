import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";
import type { HistorySetter } from "@/hooks/use-config-history";

/** Edits that follow each other within this many ms (a slider, typing) are one toast. */
const SETTLE_MS = 500;
/** How long the toast with Undo stays up. */
const UNDO_TOAST_MS = 6000;

/**
 * A workspace page's config setter that also raises a result toast with Undo once the edits settle. Undo is the studio's
 * own (Ctrl+Z), so the step it reverts is the one the history recorded; nothing is added to what the history saves.
 */
export function useUndoToast(set: HistorySetter, undo: () => void, message: string): HistorySetter {
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // The newest callbacks, so a toast raised after the delay never calls a stale undo.
  const latest = useRef({ toast, undo, message });
  latest.current = { toast, undo, message };
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback<HistorySetter>(
    (action, key) => {
      set(action, key);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        const { toast: show, undo: run, message: text } = latest.current;
        show(text, { action: { label: "Undo", onClick: run }, ms: UNDO_TOAST_MS });
      }, SETTLE_MS);
    },
    [set]
  );
}
