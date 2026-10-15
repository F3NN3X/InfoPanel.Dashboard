import { useSyncExternalStore } from "react";
import * as Q from "./queue";
import type { IslandActivity, IslandNotice, IslandSnapshot } from "./types";

/**
 * The island's notice bus: the one place anything raises a notice for the island (server alerts,
 * dashboard checks, widgets). It runs the queue (`queue.ts`) on the clock and wakes only when the
 * open notice runs out. Live activities sit beside it: the island shows one while nothing is open.
 */
export interface IslandBus {
  notify(n: IslandNotice): void;
  dismiss(source: string, id: string): void;
  /** Make `notices` the complete set from `source` (server alert sync). */
  syncSource(source: string, notices: readonly IslandNotice[]): void;
  /** Open a held notice again for `ms` (a tap on the badge). */
  peek(source: string, id: string, ms: number): void;
  /** Open time for notices that stay until tapped, ms (Infinity = until tapped). */
  setSticky(ms: number): void;
  /** Stack notices of one group into one with a count (`IslandNotice.group`). */
  setGrouping(on: boolean): void;
  /** Notices `gate` refuses are dropped (quiet hours); null lets every notice through. */
  setGate(gate: ((n: IslandNotice) => boolean) | null): void;
  /** Show an activity, or update the one with the same `(source, id)`. */
  setActivity(a: IslandActivity): void;
  /** Clear one activity of `source`, or all of them without `id`. */
  clearActivity(source: string, id?: string): void;
  subscribe(listener: () => void): () => void;
  getSnapshot(): IslandSnapshot;
}

export interface BusClock {
  now(): number;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

const realClock: BusClock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
};

const activityKey = (a: { source: string; id: string }) => Q.keyOf(a.source, a.id);

/** The activity the island shows: the highest priority, then the newest. */
function pickActivity(list: readonly IslandActivity[]): IslandActivity | null {
  let best: IslandActivity | null = null;
  for (const a of list) if (!best || (a.priority ?? 0) >= (best.priority ?? 0)) best = a;
  return best;
}

export function createIslandBus(clock: BusClock = realClock): IslandBus {
  let state = Q.emptyQueue();
  /** Insertion order is age: a re-set moves an activity to the end (newest). */
  let activities: IslandActivity[] = [];
  let gate: ((n: IslandNotice) => boolean) | null = null;
  let snapshot: IslandSnapshot = { ...Q.snapshotOf(state), activity: null };
  let timer: unknown = null;
  const listeners = new Set<() => void>();

  const publish = () => {
    const snap = { ...Q.snapshotOf(state), activity: pickActivity(activities) };
    if (snap.expanded === snapshot.expanded && samePending(snap.pending, snapshot.pending) && snap.activity === snapshot.activity) return;
    snapshot = snap;
    for (const l of listeners) l();
  };
  const commit = (next: Q.QueueState) => {
    if (next === state) return;
    state = next;
    publish();
    schedule();
  };
  const schedule = () => {
    if (timer !== null) clock.clearTimeout(timer);
    timer = null;
    const due = Q.nextDue(state, clock.now());
    if (due !== null) timer = clock.setTimeout(() => ((timer = null), commit(Q.tick(state, clock.now()))), due);
  };
  const setActivities = (next: IslandActivity[]) => {
    activities = next;
    publish();
  };

  return {
    notify: (n) => {
      if (gate && !gate(n)) return;
      commit(Q.notify(state, n, clock.now()));
    },
    dismiss: (source, id) => commit(Q.dismiss(state, source, id, clock.now())),
    syncSource: (source, notices) => commit(Q.syncSource(state, source, notices, clock.now())),
    peek: (source, id, ms) => commit(Q.peek(state, source, id, ms, clock.now())),
    setSticky: (ms) => commit(Q.setSticky(state, ms, clock.now())),
    setGrouping: (on) => commit(Q.setGrouping(state, on)),
    setGate: (g) => {
      gate = g;
    },
    setActivity: (a) => {
      const key = activityKey(a);
      const prev = activities.find((x) => activityKey(x) === key);
      if (prev && sameActivity(prev, a)) return;
      setActivities([...activities.filter((x) => x !== prev), a]);
    },
    clearActivity: (source, id) => {
      const next = activities.filter((a) => a.source !== source || (id !== undefined && a.id !== id));
      if (next.length !== activities.length) setActivities(next);
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnapshot: () => snapshot,
  };
}

const samePending = (a: readonly unknown[], b: readonly unknown[]) => a.length === b.length && a.every((x, i) => x === b[i]);

const sameActivity = (a: IslandActivity, b: IslandActivity) =>
  a.title === b.title &&
  a.subtitle === b.subtitle &&
  a.image === b.image &&
  a.color === b.color &&
  a.progress === b.progress &&
  a.priority === b.priority;

/** The dashboard's island bus. */
export const islandBus = createIslandBus();

/** Raise a notice on the island (see `IslandNotice`). */
export const notify = (n: IslandNotice) => islandBus.notify(n);

/** What the island shows, re-rendering on change. */
export const useIsland = (bus: IslandBus = islandBus): IslandSnapshot =>
  useSyncExternalStore(bus.subscribe, bus.getSnapshot, bus.getSnapshot);
