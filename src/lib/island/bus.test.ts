import { describe, expect, it } from "vitest";
import { createIslandBus } from "./bus";
import { fakeClock } from "./test-clock";

describe("island bus", () => {
  it("notifies listeners and collapses the open notice to a badge on its timer", () => {
    const { clock, advance, pendingTimers } = fakeClock();
    const bus = createIslandBus(clock);
    let calls = 0;
    bus.subscribe(() => calls++);
    bus.notify({ source: "t", id: "a", severity: "info", title: "A", ttl: 1000, badge: true });
    expect(bus.getSnapshot().expanded?.id).toBe("a");
    expect(calls).toBe(1);
    expect(pendingTimers()).toBe(1);
    advance(1000);
    expect(bus.getSnapshot().expanded).toBeNull();
    expect(bus.getSnapshot().pending.map((i) => i.id)).toEqual(["a"]);
    expect(pendingTimers()).toBe(0);
    bus.peek("t", "a", 500);
    expect(bus.getSnapshot().expanded?.id).toBe("a");
    advance(500);
    bus.dismiss("t", "a");
    expect(bus.getSnapshot().pending).toEqual([]);
  });

  it("ends a plain notice with its open time", () => {
    const { clock, advance } = fakeClock();
    const bus = createIslandBus(clock);
    bus.notify({ source: "t", id: "a", severity: "info", title: "A", ttl: 1000 });
    advance(1000);
    expect(bus.getSnapshot()).toMatchObject({ expanded: null, pending: [] });
  });

  it("keeps the snapshot identity when nothing changed", () => {
    const { clock } = fakeClock();
    const bus = createIslandBus(clock);
    const before = bus.getSnapshot();
    bus.dismiss("t", "missing");
    bus.syncSource("alerts", []);
    bus.clearActivity("nobody");
    expect(bus.getSnapshot()).toBe(before);
  });

  it("starts no timer for a notice open until tapped", () => {
    const { clock, pendingTimers } = fakeClock();
    const bus = createIslandBus(clock);
    bus.notify({ source: "t", id: "c", severity: "critical", title: "C" });
    expect(pendingTimers()).toBe(0);
    bus.setSticky(3000);
    expect(pendingTimers()).toBe(1);
  });

  it("drops the notices its gate refuses", () => {
    const bus = createIslandBus(fakeClock().clock);
    bus.setGate((n) => n.severity === "critical");
    bus.notify({ source: "t", id: "i", severity: "info", title: "I" });
    expect(bus.getSnapshot().expanded).toBeNull();
    bus.notify({ source: "t", id: "c", severity: "critical", title: "C" });
    expect(bus.getSnapshot().expanded?.id).toBe("c");
    bus.setGate(null);
    bus.notify({ source: "t", id: "i", severity: "info", title: "I" });
    expect(bus.getSnapshot().pending.map((i) => i.id)).toEqual(["i"]);
  });

  it("shows the highest-priority, newest activity and ignores repeats", () => {
    const bus = createIslandBus(fakeClock().clock);
    let calls = 0;
    bus.subscribe(() => calls++);
    bus.setActivity({ source: "music", id: "track", title: "Song" });
    bus.setActivity({ source: "music", id: "track", title: "Song" });
    expect(calls).toBe(1);
    bus.setActivity({ source: "call", id: "c", title: "Call", priority: 1 });
    bus.setActivity({ source: "music", id: "track", title: "Next song" });
    expect(bus.getSnapshot().activity?.title).toBe("Call");
    bus.clearActivity("call");
    expect(bus.getSnapshot().activity?.title).toBe("Next song");
    bus.clearActivity("music", "track");
    expect(bus.getSnapshot().activity).toBeNull();
  });
});
