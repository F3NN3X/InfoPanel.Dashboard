import { describe, expect, it } from "vitest";
import { placementContent, placementPrefixes } from "./placement-content";
import { BLANK_MODULE, CARDS_ID, type Placement } from "@/lib/layout";
import { YR_FORECAST_KEY } from "@/lib/sensors";

const place = (extra: Partial<Placement>): Placement =>
  ({ id: "p", module: "", col: 1, row: 1, colSpan: 2, rowSpan: 1, visible: true, ...extra }) as Placement;

describe("placementPrefixes", () => {
  it("reads a module's owned and read prefixes", () => {
    expect(placementPrefixes(place({ module: "systemmodern" }))).toEqual(["system.cpu.", "system.ram.", "libre."]);
    expect(placementPrefixes(place({ module: "mediamodern" }))).toEqual([
      "plugins.media-plugin.",
      "plugins.audio-level-meter.",
    ]);
  });

  it("subscribes a panel to its visible widgets' keys", () => {
    const panel = {
      title: "t",
      widgets: [
        { id: "a", kind: "stat", visible: true, sensor: "libre.cpu_load", subSensor: "libre.cpu_temp" },
        { id: "b", kind: "table", visible: true, sensor: YR_FORECAST_KEY },
        { id: "c", kind: "stat", visible: false, sensor: "system.ram.load" },
        { id: "d", kind: "clock", visible: true },
      ],
    };
    expect(placementPrefixes(place({ module: "panel", panel } as Partial<Placement>))).toEqual([
      "libre.cpu_load",
      "libre.cpu_temp",
      "plugins.yr-weather-plugin.",
    ]);
  });

  it("needs everything for the cards grid and nothing for blank or sensorless zones", () => {
    expect(placementPrefixes(place({ module: CARDS_ID }))).toBeNull();
    expect(placementPrefixes(place({ module: BLANK_MODULE }))).toEqual([]);
    expect(placementPrefixes(place({ module: "wavelinkmodern" }))).toEqual([]);
    expect(placementPrefixes(place({ module: "unknown" }))).toEqual([]);
  });
});

describe("placementContent", () => {
  it("shows a System widget set to Disks only when just drive data exists", () => {
    const drives = {
      "libre.x_nvme_used_space": { value: 10, unit: "%", name: "X NVMe Used Space" },
    } as never;
    const disksOnly = place({ module: "systemmodern", settings: { devices: "disk" } });
    expect(placementContent(disksOnly, drives, []).hasData).toBe(true);
    expect(placementContent(place({ module: "systemmodern" }), drives, []).hasData).toBe(false);
  });

  const paused = { "plugins.media-plugin.media.playback-state": { value: 1 } } as never;
  const playing = { "plugins.media-plugin.media.playback-state": { value: 2 } } as never;

  it("flags an idle widget only when it is set to hide when idle", () => {
    const media = place({ module: "mediamodern" });
    expect(placementContent(media, paused, []).idle).toBe(false);
    const hiding = place({ module: "mediamodern", settings: { hideWhenIdle: true } });
    expect(placementContent(hiding, paused, []).idle).toBe(true);
    expect(placementContent(hiding, playing, []).idle).toBe(false);
  });

  it("resolves the look under the global style (frame tokens follow it)", () => {
    const accent = (p: Placement, a: Parameters<typeof placementContent>[3]) =>
      (placementContent(p, paused, [], a).scope as Record<string, string> | undefined)?.["--accent"];
    const global = { dashboard: { accent: "#ff0000" }, profile: { accent: "#00ff00" }, enforce: false };
    const media = place({ module: "mediamodern" });
    expect(accent(media, undefined)).toBeUndefined();
    expect(accent(media, { dashboard: { accent: "#ff0000" }, enforce: false })).toBe("0 100% 50%");
    expect(accent(media, global)).toBe("120 100% 50%");
    const own = place({ module: "mediamodern", settings: { accent: "#0000ff", hideWhenIdle: true } });
    expect(accent(own, global)).toBe("240 100% 50%");
    expect(accent({ ...own, styleMode: "follow" }, global)).toBe("120 100% 50%");
    expect(accent(own, { ...global, enforce: true })).toBe("120 100% 50%");
    // Content keys stay the widget's, followed or not.
    expect(placementContent({ ...own, styleMode: "follow" }, paused, [], global).idle).toBe(true);
  });
});
