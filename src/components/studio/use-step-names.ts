import { useEffect, useMemo, useState } from "react";
import type { DashboardConfig } from "@/lib/layout";

type Kit = typeof import("./editor/undo-describe");

interface Peek {
  canUndo: boolean;
  canRedo: boolean;
  /** The snapshots Undo and Redo go to, and the config now. */
  stack: { current: { past: readonly DashboardConfig[]; future: readonly DashboardConfig[] } };
  latest: { current: DashboardConfig };
}

/**
 * What Undo and Redo would change, in words (E3), read from the snapshots the history already keeps: no label is
 * stored and nothing enters the config. The describer loads with the first step, out of the studio's first download.
 */
export function useStepNames(history: Peek, on: boolean) {
  const stack = history.stack.current;
  const [kit, setKit] = useState<Kit | null>(null);
  const some = history.canUndo || history.canRedo;
  useEffect(() => {
    if (on && some && !kit) void import("./editor/undo-describe").then(setKit);
  }, [on, some, kit]);
  const undo = stack.past.at(-1);
  const redo = stack.future.at(-1);
  const now = history.latest.current;
  // Named again only when a snapshot or the config is a new one, not on every render of a drag.
  const names = useMemo(() => ({ undo: on && kit && undo ? kit.describeChange(undo, now) : null, redo: on && kit && redo ? kit.describeChange(now, redo) : null }), [on, kit, undo, redo, now]);
  return {
    kit,
    ...names,
    /** The names now, for a toast's button that outlives the render it was made in. */
    peek: () => {
      const { past, future } = history.stack.current;
      const [u, r, c] = [past.at(-1), future.at(-1), history.latest.current];
      return { undo: on && kit && u ? kit.describeChange(u, c) : null, redo: on && kit && r ? kit.describeChange(c, r) : null };
    },
  };
}
