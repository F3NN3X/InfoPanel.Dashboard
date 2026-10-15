import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import type { DashboardModule } from "@/modules/types";
import { TEMPLATE_MODULES } from "@/widgets/registry";
import { createIslandBus } from "./bus";
import { applyUpdate, ISLAND_SETTING, islandFeeds, runDataFeeds, type IslandSourceDef } from "./sources";
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
  it("gives Now Playing, Steam Friends and Wave Link a Send to island setting, off by default", () => {
    const withIsland = TEMPLATE_MODULES.filter((m) => m.island).map((m) => m.id).sort();
    expect(withIsland).toEqual(["NowPlaying", "SteamFriends", "WaveLink"]);
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
