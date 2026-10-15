import { describe, expect, it } from "vitest";
import type { IslandNotice } from "./types";
import { DEFAULT_TTL, dismiss, emptyQueue, MAX_ITEMS, nextDue, notify, peek, setSticky, snapshotOf, syncSource, tick, type QueueState } from "./queue";

/** A notice that stays as a badge after its open time (as server alerts do), unless `over` says otherwise. */
const n = (id: string, over: Partial<IslandNotice> = {}): IslandNotice => ({ source: "t", id, severity: "info", title: id, badge: true, ...over });
const open = (s: QueueState) => snapshotOf(s).expanded?.id ?? null;
const pending = (s: QueueState) => snapshotOf(s).pending.map((i) => i.id);

describe("island queue", () => {
  it("opens a notice for its time, then keeps it as a badge until it ends", () => {
    let s = notify(emptyQueue(), n("a"), 0);
    expect(open(s)).toBe("a");
    expect(nextDue(s, 1000)).toBe(DEFAULT_TTL.info - 1000);
    expect(open(tick(s, DEFAULT_TTL.info - 1))).toBe("a");
    s = tick(s, DEFAULT_TTL.info);
    expect(open(s)).toBeNull();
    expect(pending(s)).toEqual(["a"]);
    expect(pending(dismiss(s, "t", "a", 5000))).toEqual([]);
  });

  it("ends a notice that is not a badge with its open time", () => {
    let s = notify(emptyQueue(), n("a", { badge: false, ttl: 1000, cooldownMs: 5000 }), 0);
    s = tick(s, 1000);
    expect(s.items).toEqual([]);
    expect(open(notify(s, n("a", { badge: false, cooldownMs: 5000 }), 3000))).toBeNull();
  });

  it("opens a held badge again for a peek, then shrinks it back", () => {
    let s = notify(emptyQueue(), n("a", { ttl: 1000 }), 0);
    s = tick(s, 1000);
    s = peek(s, "t", "a", 3000, 2000);
    expect(open(s)).toBe("a");
    expect(nextDue(s, 2000)).toBe(3000);
    s = tick(s, 5000);
    expect(open(s)).toBeNull();
    expect(pending(s)).toEqual(["a"]);
  });

  it("lets a stronger notice take over at once; the one replaced keeps its time left", () => {
    let s = notify(emptyQueue(), n("info", { ttl: 4000 }), 0);
    s = notify(s, n("crit", { severity: "critical", ttl: 2000 }), 1000);
    expect(open(s)).toBe("crit");
    s = tick(s, 3000);
    expect(open(s)).toBe("info");
    // 1 s of its 4 s was used before the critical one came.
    expect(nextDue(s, 3000)).toBe(3000);
  });

  it("makes an equal or weaker notice wait its turn", () => {
    let s = notify(emptyQueue(), n("w1", { severity: "warning", ttl: 2000 }), 0);
    s = notify(s, n("w2", { severity: "warning", ttl: 2000 }), 500);
    s = notify(s, n("i", { ttl: 2000 }), 600);
    expect(open(s)).toBe("w1");
    s = tick(s, 2000);
    expect(open(s)).toBe("w2");
    s = tick(s, 4000);
    expect(open(s)).toBe("i");
  });

  it("keeps a critical notice open until tapped, or for the collapse time", () => {
    let s = notify(emptyQueue(), n("c", { severity: "critical" }), 0);
    expect(nextDue(s, 0)).toBeNull();
    expect(open(tick(s, 1e9))).toBe("c");
    s = setSticky(s, 10_000, 1000);
    expect(open(tick(s, 10_999))).toBe("c");
    expect(open(tick(s, 11_000))).toBeNull();
    expect(pending(tick(s, 11_000))).toEqual(["c"]);
  });

  it("starts sticky notices with the collapse time set beforehand", () => {
    const s = notify(emptyQueue(5000), n("c", { severity: "critical" }), 0);
    expect(nextDue(s, 0)).toBe(5000);
  });

  it("updates a repeated notice in place, and opens it again only when its severity rises", () => {
    let s = notify(emptyQueue(), n("a", { ttl: 2000 }), 0);
    s = tick(s, 2000);
    s = notify(s, n("a", { ttl: 2000, title: "again" }), 2500);
    expect(open(s)).toBeNull();
    expect(snapshotOf(s).pending[0].title).toBe("again");
    s = notify(s, n("a", { severity: "warning", ttl: 2000 }), 3000);
    expect(open(s)).toBe("a");
    expect(snapshotOf(s).expanded?.firstAt).toBe(0);
  });

  it("ignores a notice inside its cooldown after it ended", () => {
    let s = notify(emptyQueue(), n("a", { cooldownMs: 10_000 }), 0);
    s = dismiss(s, "t", "a", 1000);
    expect(pending(notify(s, n("a", { cooldownMs: 10_000 }), 10_999))).toEqual([]);
    expect(open(notify(s, n("a", { cooldownMs: 10_000 }), 11_000))).toBe("a");
  });

  it("syncs a source: new ones are added, missing ones end, other sources stay", () => {
    let s = notify(emptyQueue(), n("x", { source: "other", ttl: 1 }), 0);
    s = syncSource(s, "alerts", [n("a1"), n("a2")], 10);
    expect([open(s), ...pending(s)].sort()).toEqual(["a1", "a2", "x"]);
    s = syncSource(s, "alerts", [n("a2")], 20);
    expect([open(s), ...pending(s)].filter(Boolean).sort()).toEqual(["a2", "x"]);
    expect(syncSource(s, "alerts", [], 30).items.map((i) => i.id)).toEqual(["x"]);
  });

  it(`holds at most ${MAX_ITEMS}, dropping the weakest, oldest`, () => {
    let s = notify(emptyQueue(), n("crit", { severity: "critical" }), 0);
    for (let i = 0; i < MAX_ITEMS; i++) s = notify(s, n(`i${i}`), i + 1);
    expect(s.items).toHaveLength(MAX_ITEMS);
    expect(s.items.some((i) => i.id === "i0")).toBe(false);
    expect(open(s)).toBe("crit");
  });

  it("keeps a refreshing notice open while it repeats, with its level", () => {
    let s = notify(emptyQueue(), n("vol", { badge: false, ttl: 1500, refresh: true, progress: 0.4 }), 0);
    s = notify(s, n("vol", { badge: false, ttl: 1500, refresh: true, progress: 0.5 }), 1000);
    s = tick(s, 2000);
    expect(open(s)).toBe("vol");
    expect(snapshotOf(s).expanded?.progress).toBe(0.5);
    expect(open(tick(s, 2600))).toBeNull();
  });

  it("keeps a plain repeat on its first open time", () => {
    let s = notify(emptyQueue(), n("x", { badge: false, ttl: 1500 }), 0);
    s = notify(s, n("x", { badge: false, ttl: 1500 }), 1000);
    expect(open(tick(s, 1600))).toBeNull();
  });
});
