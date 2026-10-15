import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createIslandBus } from "@/lib/island/bus";
import { ISLAND_DEFAULTS, type IslandConfig } from "@/lib/island/config";
import type { IslandItem } from "@/lib/island/types";
import { GeneralProvider } from "@/hooks/use-general";
import { GENERAL_DEFAULTS } from "@/lib/general";
import { DynamicIsland } from "./dynamic-island";
import { EXPANDED_MAX_SHARE, fitIslandSize, islandBox, islandMode, islandReserve } from "./island-model";

const PAGE = { width: 1920, height: 1080 };

const render = (bus = createIslandBus(), config: Partial<IslandConfig> = {}, motion: "reduce" | "full" = "full") =>
  renderToString(
    <GeneralProvider value={{ ...GENERAL_DEFAULTS, motion, hour12: false, showSeconds: false }}>
      <DynamicIsland config={{ ...ISLAND_DEFAULTS, ...config }} alerts={[]} placement="fixed" page={PAGE} bus={bus} />
    </GeneralProvider>
  );

describe("DynamicIsland", () => {
  it("shows the time when idle", () => {
    const html = render();
    expect(html).toContain('data-island="idle"');
    expect(html).toMatch(/\d{2}:\d{2}/);
  });

  it("renders nothing when idle is hidden and there is nothing to show", () => {
    expect(render(createIslandBus(), { idle: "hidden" })).toBe("");
  });

  it("shows a sensor's label beside the time, a dash before it reports", () => {
    const html = render(createIslandBus(), { idle: "sensor", sensorKey: "test.none", sensorLabel: "GPU" });
    expect(html).toContain("GPU");
    expect(html).toContain("–");
  });

  it("opens for a notice with its title, body and role", () => {
    const bus = createIslandBus();
    bus.notify({ source: "t", id: "a", severity: "warning", title: "CPU hot", body: "92 °C" });
    const html = render(bus);
    expect(html).toContain('data-island="expanded"');
    expect(html).toContain('role="alert"');
    expect(html).toContain("CPU hot");
    expect(html).toContain("92 °C");
    expect(html).toContain("island-motion");
  });

  it("shows a notice's image in place of the icon", () => {
    const bus = createIslandBus();
    bus.notify({ source: "t", id: "a", severity: "info", title: "Song", image: "https://example.test/art.png" });
    expect(render(bus)).toContain('src="https://example.test/art.png"');
  });

  it("shows a live activity beside the time", () => {
    const bus = createIslandBus();
    bus.setActivity({ source: "NowPlaying", id: "track", title: "Song", subtitle: "Artist", progress: 0.5 });
    const html = render(bus);
    expect(html).toContain('data-island="activity"');
    expect(html).toContain("Song");
    expect(html).toContain("Artist");
    expect(html).toContain("width:50%");
  });

  it("pulses a critical notice only with motion", () => {
    const bus = createIslandBus();
    bus.notify({ source: "t", id: "c", severity: "critical", title: "Down" });
    expect(render(bus)).toContain("island-critical");
    const reduced = render(bus, {}, "reduce");
    expect(reduced).not.toContain("island-critical");
    expect(reduced).not.toContain("island-motion");
    expect(reduced).not.toContain("island-fade");
  });

  it("takes the theme's card colour when tinted", () => {
    expect(render(createIslandBus(), { tint: "theme" })).toContain("bg-card");
    expect(render()).toContain("bg-black");
  });
});

describe("island model", () => {
  const empty = { expanded: null, pending: [], activity: null };
  const item: IslandItem = { key: "t:a", source: "t", id: "a", severity: "info", title: "A", onTap: "dismiss", cooldownMs: 0, badge: true, firstAt: 0, updatedAt: 0, remaining: 0 };

  it("picks the mode from the snapshot and the idle setting", () => {
    expect(islandMode(empty, "time")).toBe("idle");
    expect(islandMode(empty, "hidden")).toBe("none");
    expect(islandMode({ ...empty, pending: [item] }, "hidden")).toBe("compact");
    expect(islandMode({ ...empty, expanded: item }, "time")).toBe("expanded");
    const activity = { source: "m", id: "t", title: "Song" };
    expect(islandMode({ ...empty, activity }, "hidden")).toBe("activity");
    // A held notice wins over the activity.
    expect(islandMode({ ...empty, pending: [item], activity }, "time")).toBe("compact");
  });

  it("grows from idle to compact to expanded", () => {
    const idle = islandBox("idle", "m", "time");
    const compact = islandBox("compact", "m", "time");
    const expanded = islandBox("expanded", "m", "time");
    expect(compact.width).toBeGreaterThan(idle.width);
    expect(expanded.width).toBeGreaterThan(compact.width);
    expect(expanded.height).toBeGreaterThan(compact.height);
    expect(islandBox("idle", "m", "time-date").width).toBeGreaterThan(idle.width);
    expect(islandBox("idle", "m", "sensor").width).toBe(islandBox("idle", "m", "time-date").width);
    expect(islandBox("activity", "m", "time").height).toBe(idle.height);
  });

  it("fits the size to the page: the open island stays within its share of the height", () => {
    expect(fitIslandSize("l", { width: 1920, height: 1080 })).toBe("l");
    expect(fitIslandSize("l", { width: 1920, height: 200 })).toBe("m");
    expect(fitIslandSize("m", { width: 1920, height: 160 })).toBe("s");
    expect(fitIslandSize("l", { width: 320, height: 1080 })).toBe("s");
    expect(fitIslandSize("m", { width: 0, height: 0 })).toBe("m");
    for (const page of [{ width: 1920, height: 550 }, { width: 1024, height: 600 }]) {
      const box = islandBox("expanded", fitIslandSize("l", page), "time");
      expect(box.height).toBeLessThanOrEqual(page.height * EXPANDED_MAX_SHARE);
      expect(box.width).toBeLessThan(page.width);
    }
  });

  it("reserves the pill's height below its offset only when asked", () => {
    const island = { ...ISLAND_DEFAULTS, offsetY: 10 };
    expect(islandReserve(island, PAGE)).toBe(0);
    expect(islandReserve({ ...island, reserve: true }, PAGE)).toBe(10 + 36 + 8);
    expect(islandReserve({ ...island, reserve: true, enabled: false }, PAGE)).toBe(0);
    expect(islandReserve(undefined, PAGE)).toBe(0);
  });
});
