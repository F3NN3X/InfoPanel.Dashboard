/*
 * Undo/redo stacks of whole snapshots. Pure: every function returns a new
 * history; the hook (use-config-history) holds it and applies the values.
 */

/** Steps kept on the undo stack; the oldest fall off. */
export const HISTORY_LIMIT = 100;

/** Changes with the same key closer together than this are one step. */
export const COALESCE_MS = 500;

export interface History<T> {
  /** Earlier snapshots, oldest first. */
  past: T[];
  /** Undone snapshots, the next redo last. */
  future: T[];
  /** Key and time of the last recorded change (for coalescing). */
  lastKey: string | null;
  lastAt: number;
}

export function emptyHistory<T>(): History<T> {
  return { past: [], future: [], lastKey: null, lastAt: 0 };
}

/**
 * Record a change away from `prev`. A change tagged with the same key as
 * the previous one, within COALESCE_MS of it, joins that step (a slider
 * drag or zone drag is one undo). Any new change clears the redo stack.
 */
export function recordChange<T>(
  history: History<T>,
  prev: T,
  key: string | undefined,
  at: number
): History<T> {
  const coalesce =
    key !== undefined &&
    key === history.lastKey &&
    at - history.lastAt < COALESCE_MS &&
    history.past.length > 0;
  return {
    past: coalesce ? history.past : [...history.past, prev].slice(-HISTORY_LIMIT),
    future: [],
    lastKey: key ?? null,
    lastAt: at,
  };
}

/** Step back: the snapshot to show, and `current` moves to the redo stack. */
export function undoChange<T>(
  history: History<T>,
  current: T
): { history: History<T>; value: T } | null {
  if (history.past.length === 0) return null;
  return {
    value: history.past[history.past.length - 1],
    history: {
      past: history.past.slice(0, -1),
      future: [...history.future, current],
      lastKey: null,
      lastAt: 0,
    },
  };
}

/** Step forward again: the inverse of `undoChange`. */
export function redoChange<T>(
  history: History<T>,
  current: T
): { history: History<T>; value: T } | null {
  if (history.future.length === 0) return null;
  return {
    value: history.future[history.future.length - 1],
    history: {
      past: [...history.past, current].slice(-HISTORY_LIMIT),
      future: history.future.slice(0, -1),
      lastKey: null,
      lastAt: 0,
    },
  };
}
