import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DashboardConfig } from "@/lib/layout";
import {
  beginTransaction,
  cancelTransaction,
  commitTransaction,
  emptyHistory,
  recordChange,
  redoChange,
  undoChange,
  type History,
} from "./config-history";

/** A config setter that records an undo step; `key` coalesces repeats. */
export type HistorySetter = (action: SetStateAction<DashboardConfig>, key?: string) => void;

/**
 * Undo/redo over the dashboard config. Wraps the owner's setter: every
 * change made through `set` is recorded (changes with the same `key`
 * within 500ms are one step), and undo/redo write snapshots back through
 * the same setter — so persistence and the server push see them like any
 * other edit. A config replaced from outside (the server copy arriving)
 * starts a fresh history.
 */
export function useConfigHistory(
  config: DashboardConfig,
  setConfig: Dispatch<SetStateAction<DashboardConfig>>
) {
  // The newest config, also between a set and the re-render it causes, so
  // several changes in one event chain correctly.
  const latest = useRef(config);
  const history = useRef<History<DashboardConfig>>(emptyHistory());
  const [counts, setCounts] = useState({ undo: 0, redo: 0 });

  const apply = useCallback(
    (next: DashboardConfig, nextHistory: History<DashboardConfig>) => {
      latest.current = next;
      history.current = nextHistory;
      setCounts({ undo: nextHistory.past.length, redo: nextHistory.future.length });
      setConfig(next);
    },
    [setConfig]
  );

  useLayoutEffect(() => {
    if (config === latest.current) return;
    latest.current = config;
    history.current = emptyHistory();
    setCounts({ undo: 0, redo: 0 });
  }, [config]);

  const set: HistorySetter = useCallback(
    (action, key) => {
      const prev = latest.current;
      const next = typeof action === "function" ? action(prev) : action;
      if (next === prev) return;
      apply(next, recordChange(history.current, prev, key, Date.now()));
    },
    [apply]
  );

  const begin = useCallback(() => {
    history.current = beginTransaction(history.current, latest.current);
  }, []);

  const commit = useCallback(() => {
    if (!history.current.txn) return;
    history.current = commitTransaction(history.current, latest.current, Date.now());
    setCounts({ undo: history.current.past.length, redo: history.current.future.length });
  }, []);

  const cancel = useCallback(() => {
    const step = cancelTransaction(history.current);
    if (step) apply(step.value, step.history);
  }, [apply]);

  const undo = useCallback(() => {
    if (history.current.txn) return;
    const step = undoChange(history.current, latest.current);
    if (step) apply(step.value, step.history);
  }, [apply]);

  const redo = useCallback(() => {
    if (history.current.txn) return;
    const step = redoChange(history.current, latest.current);
    if (step) apply(step.value, step.history);
  }, [apply]);

  return { set, begin, commit, cancel, undo, redo, canUndo: counts.undo > 0, canRedo: counts.redo > 0 };
}
