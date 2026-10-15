import type { Severity } from "@/lib/alerts";
import type { IslandItem, IslandNotice, IslandSnapshot } from "./types";

/**
 * The island's queue as pure functions of (state, now): which notice the island is open for, and
 * which wait as a badge. One notice is open at a time; a stronger one takes over at once (the one
 * it replaced keeps its open time left), an equal or weaker one waits its turn.
 */

/** Open time by severity when a notice sets no `ttl`, ms (0 = until tapped). */
export const DEFAULT_TTL: Record<Severity, number> = { info: 4000, warning: 8000, critical: 0 };
/** Most notices held; past it the weakest, oldest go first. */
export const MAX_ITEMS = 20;
/** Cooldown records are kept this long, ms. */
const ENDED_KEEP_MS = 3_600_000;

const RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

export interface QueueState {
  items: readonly IslandItem[];
  /** The open notice and since when (its open time is charged from then). */
  open: { key: string; since: number } | null;
  /** When each ended notice with a cooldown ended, by key. */
  ended: Readonly<Record<string, number>>;
  /** Open time for notices that stay until tapped, ms (Infinity = until tapped). */
  stickyMs: number;
}

export const emptyQueue = (stickyMs = Infinity): QueueState => ({ items: [], open: null, ended: {}, stickyMs });

export const keyOf = (source: string, id: string) => `${source}:${id}`;

const openTime = (n: IslandNotice, stickyMs: number) => {
  const ttl = n.ttl ?? DEFAULT_TTL[n.severity];
  return ttl > 0 ? ttl : stickyMs;
};

/** Strongest first, then newest. */
const stronger = (a: IslandItem, b: IslandItem) => RANK[b.severity] - RANK[a.severity] || b.firstAt - a.firstAt;

/** Charge the open notice for the time it has been open, so `since` is `now`. */
function charge(s: QueueState, now: number): QueueState {
  if (!s.open) return s;
  const { key, since } = s.open;
  const elapsed = Math.max(0, now - since);
  const items = s.items.map((i) => (i.key === key ? { ...i, remaining: Math.max(0, i.remaining - elapsed) } : i));
  return { ...s, items, open: { key, since: now } };
}

/** Keep the open notice unless it ran out or a stronger one waits; else open the strongest. */
function select(s: QueueState, now: number): QueueState {
  const waiting = s.items.filter((i) => i.remaining > 0).sort(stronger);
  const current = s.open && waiting.find((i) => i.key === s.open?.key);
  const best = waiting[0];
  if (current && RANK[best.severity] <= RANK[current.severity]) return s;
  return { ...s, open: best ? { key: best.key, since: now } : null };
}

/** End the notices whose open time ran out and that do not stay as a badge. */
function expire(s: QueueState, now: number): QueueState {
  const done = s.items.filter((i) => i.remaining <= 0 && !i.badge).map((i) => i.key);
  return remove(s, new Set(done), now);
}

/** The state after `fn`, with the open notice charged before and chosen again after. */
const step = (s: QueueState, now: number, fn: (s: QueueState) => QueueState) => select(expire(fn(charge(s, now)), now), now);

/** Drop items by key, recording the end of those with a cooldown. */
function remove(s: QueueState, keys: ReadonlySet<string>, now: number): QueueState {
  if (keys.size === 0) return s;
  const ended: Record<string, number> = {};
  for (const [k, at] of Object.entries(s.ended)) if (now - at < ENDED_KEEP_MS) ended[k] = at;
  for (const i of s.items) if (keys.has(i.key) && i.cooldownMs > 0) ended[i.key] = now;
  return {
    ...s,
    items: s.items.filter((i) => !keys.has(i.key)),
    open: s.open && keys.has(s.open.key) ? null : s.open,
    ended,
  };
}

/** Add or update one notice (no `charge` / `select`). */
function upsert(s: QueueState, n: IslandNotice, now: number): QueueState {
  const key = keyOf(n.source, n.id);
  const prev = s.items.find((i) => i.key === key);
  if (!prev) {
    const endedAt = s.ended[key];
    if (endedAt !== undefined && now - endedAt < (n.cooldownMs ?? 0)) return s;
  }
  const fields = {
    severity: n.severity,
    title: n.title,
    body: n.body,
    image: n.image,
    onTap: n.onTap ?? "dismiss",
    alertId: n.alertId,
    cooldownMs: n.cooldownMs ?? 0,
    badge: n.badge ?? false,
  };
  if (prev) {
    // A repeat updates in place; only a rise in severity opens it again.
    const rose = RANK[n.severity] > RANK[prev.severity];
    const item = { ...prev, ...fields, updatedAt: now, remaining: rose ? openTime(n, s.stickyMs) : prev.remaining };
    return { ...s, items: s.items.map((i) => (i.key === key ? item : i)) };
  }
  const item: IslandItem = { key, source: n.source, id: n.id, ...fields, firstAt: now, updatedAt: now, remaining: openTime(n, s.stickyMs) };
  const items = [...s.items, item];
  if (items.length <= MAX_ITEMS) return { ...s, items };
  const weakest = items.filter((i) => i.key !== s.open?.key).sort(stronger).at(-1);
  return weakest ? remove({ ...s, items }, new Set([weakest.key]), now) : { ...s, items };
}

export const notify = (s: QueueState, n: IslandNotice, now: number): QueueState => step(s, now, (t) => upsert(t, n, now));

export const dismiss = (s: QueueState, source: string, id: string, now: number): QueueState =>
  step(s, now, (t) => remove(t, new Set([keyOf(source, id)]), now));

/** Make `notices` the complete set from `source`: new ones are added, missing ones end. */
export function syncSource(s: QueueState, source: string, notices: readonly IslandNotice[], now: number): QueueState {
  return step(s, now, (t) => {
    const keep = new Set(notices.map((n) => keyOf(source, n.id)));
    const gone = new Set(t.items.filter((i) => i.source === source && !keep.has(i.key)).map((i) => i.key));
    return notices.reduce((acc, n) => upsert(acc, { ...n, source }, now), remove(t, gone, now));
  });
}

/** Let time pass: the open notice that ran out turns into a badge and the next one opens. */
export function tick(s: QueueState, now: number): QueueState {
  if (!s.open) return s;
  const open = s.items.find((i) => i.key === s.open?.key);
  if (open && now - s.open.since < open.remaining) return s;
  return step(s, now, (t) => t);
}

/** Change the open time of notices that stay until tapped (the profile's collapse timer). */
export function setSticky(s: QueueState, stickyMs: number, now: number): QueueState {
  if (s.stickyMs === stickyMs) return s;
  return step(s, now, (t) => ({
    ...t,
    stickyMs,
    // Sticky ones not yet charged move to the new time; any already open keep their time used.
    items: t.items.map((i) => (i.remaining === t.stickyMs ? { ...i, remaining: stickyMs } : i)),
  }));
}

/** Open a held notice again for `ms` (a tap on the badge); the open one, if any, keeps its time. */
export const peek = (s: QueueState, source: string, id: string, ms: number, now: number): QueueState =>
  step(s, now, (t) => ({ ...t, items: t.items.map((i) => (i.key === keyOf(source, id) ? { ...i, remaining: ms } : i)) }));

/** Ms until the open notice runs out (null: nothing open, or open until tapped). */
export function nextDue(s: QueueState, now: number): number | null {
  if (!s.open) return null;
  const open = s.items.find((i) => i.key === s.open?.key);
  if (!open || !Number.isFinite(open.remaining)) return null;
  return Math.max(0, open.remaining - (now - s.open.since));
}

export function snapshotOf(s: QueueState): Omit<IslandSnapshot, "activity"> {
  const expanded = (s.open && s.items.find((i) => i.key === s.open?.key)) || null;
  return { expanded, pending: s.items.filter((i) => i !== expanded).sort(stronger) };
}
