import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import type { DashboardModule } from "@/modules/types";
import { TEMPLATE_MODULES } from "@/widgets/registry";
import { createIslandBus } from "./bus";
import { applyUpdate, feedReads, ISLAND_SETTING, isIslandKey, islandFeeds, islandSettings, runDataFeeds, storeSource, type IslandSourceDef } from "./sources";
import { fakeClock } from "./test-clock";

const zone = (id: string, module: string, settings: Placement["settings"] = {}, visible = true): Placement => ({
  id,
  module,
  colStart: 1,
  rowStart: 1,
  colSpan: 1,
  rowSpan: 1,
  visible,
  settings,
});

describe("widgets as island sources", () => {
  it("gives the source widgets a Send to island setting, off by default", () => {
    const withIsland = TEMPLATE_MODULES.filter((m) => m.island).map((m) => m.id).sort();
    expect(withIsland).toEqual([
      "Achievements",
      "DriveSpace",
      "FpsMonitor",
      "NetworkAdapters",
      "NetworkThroughput",
      "Notifications",
      "NowPlaying",
      "SteamFriends",
      "SteamNews",
      "Timer",
      "VolumeMixer",
      "WaveLink",
      "Weather",
    ]);
    for (const m of TEMPLATE_MODULES.filter((m) => m.island)) {
      expect(m.settings?.find((s) => s.key === ISLAND_SETTING)).toMatchObject({ type: "boolean", default: false, group: m.island!.group });
    }
    expect(TEMPLATE_MODULES.find((m) => m.id === "Clock")?.settings?.some((s) => s.key === ISLAND_SETTING)).toBe(false);
  });

  it("feeds the visible zones with the setting on, one per widget", () => {
    const feeds = islandFeeds(
      [
        zone("a", "NowPlaying", { island: true, source: "spotify" }),
        zone("b", "NowPlaying", { island: true }),
        zone("c", "SteamFriends"),
        zone("d", "WaveLink", { island: true }, false),
        zone("e", "Clock", { island: true }),
      ],
      TEMPLATE_MODULES
    );
    expect(feeds.map((f) => f.module.id)).toEqual(["NowPlaying"]);
    expect(feeds[0].settings.source).toBe("spotify");
  });
});

describe("the data feed pass", () => {
  const derive = (prev: unknown, next: Record<string, unknown>) => ({
    notices: prev ? [{ id: "n", severity: "info" as const, title: String(next["x.v"]), ttl: 1000 }] : [],
    activity: { id: "a", title: `now ${String(next["x.v"])}` },
  });
  const mod = {
    id: "W",
    title: "W",
    prefixes: ["x."],
    render: () => null,
    island: { from: "data", hint: "", defaultOn: true, group: "W", derive } satisfies IslandSourceDef,
  } as DashboardModule & { island: IslandSourceDef };
  const feeds = [{ module: mod, settings: {} }];

  it("waits for the source's keys, takes the first data as the baseline, then raises changes", () => {
    const bus = createIslandBus(fakeClock().clock);
    const prev = new Map();
    runDataFeeds(bus, feeds as never, { "y.other": "1" }, prev);
    expect(prev.size).toBe(0);
    runDataFeeds(bus, feeds as never, { "x.v": "1" }, prev);
    expect(bus.getSnapshot()).toMatchObject({ expanded: null, activity: { source: "W", title: "now 1" } });
    runDataFeeds(bus, feeds as never, { "x.v": "2" }, prev);
    expect(bus.getSnapshot().expanded).toMatchObject({ source: "W", id: "n", title: "2" });
  });

  it("clears the source's activity when an update has none", () => {
    const bus = createIslandBus(fakeClock().clock);
    applyUpdate(bus, "W", { activity: { id: "a", title: "x" } });
    applyUpdate(bus, "W", {});
    expect(bus.getSnapshot().activity).toBeNull();
  });
});

describe("island options and store sources", () => {
  it("subscribes a source to its own prefixes when its widget names none", () => {
    const feed = (id: string) => islandFeeds([zone("z", id, { island: true })], TEMPLATE_MODULES)[0];
    expect(feedReads(feed("Achievements"))).toEqual(["plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.", "plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game"]);
    expect(feedReads(feed("DriveSpace"))).toEqual(["plugins.drive-info-plugin."]);
  });

  it("tells the island's keys from a widget's own", () => {
    expect(["island", "islandApps", "islandMinRate"].every(isIslandKey)).toBe(true);
    expect(["islands", "isLand", "drive"].some(isIslandKey)).toBe(false);
  });

  it("puts a source's options in its group, shown only while Send to island is on", () => {
    const [toggle, option] = islandSettings({
      from: "data",
      hint: "h",
      defaultOn: false,
      group: "G",
      options: [{ key: "islandX", label: "X", type: "boolean", default: false, visibleIf: (v) => v.mode === "a" }],
      derive: () => ({}),
    });
    expect(toggle).toMatchObject({ key: "island", group: "G" });
    expect(option.group).toBe("G");
    expect(option.visibleIf?.({ island: false, mode: "a" })).toBe(false);
    expect(option.visibleIf?.({ island: true, mode: "b" })).toBe(false);
    expect(option.visibleIf?.({ island: true, mode: "a" })).toBe(true);
  });

  it("runs a store source over the current state first, then each new one, with the zone's settings", () => {
    let listener: ((n: number) => void) | null = null;
    const store = { getState: () => 1, subscribe: (fn: (n: number) => void) => ((listener = fn), () => (listener = null)) };
    const seen: [number | null, number, unknown][] = [];
    const def = storeSource<number>({ store, hint: "", defaultOn: false, group: "G", derive: (prev, next, settings) => (seen.push([prev, next, settings.k]), {}) });
    const updates: unknown[] = [];
    const stop = def.watch(() => ({ k: "v" }), (u) => updates.push(u));
    listener!(2);
    stop();
    expect(seen).toEqual([
      [null, 1, "v"],
      [1, 2, "v"],
    ]);
    expect(updates).toHaveLength(2);
    expect(listener).toBeNull();
  });
});
