import { useEffect, useState } from "react";
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
  const [kit, setKit] = useState<Kit | null>(null);
  const some = history.canUndo || history.canRedo;
  useEffect(() => {
    if (on && some && !kit) void import("./editor/undo-describe").then(setKit);
  }, [on, some, kit]);
  const undo = history.stack.current.past.at(-1);
  const redo = history.stack.current.future.at(-1);
  const now = history.latest.current;
  return {
    kit,
    undo: on && kit && undo ? kit.describeChange(undo, now) : null,
    redo: on && kit && redo ? kit.describeChange(now, redo) : null,
  };
}
