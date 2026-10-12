import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { placementContent, placementPrefixes } from "./placement-content";
import { BLANK_MODULE, CARDS_ID, type Placement } from "@/lib/layout";
import { YR_FORECAST_KEY } from "@/lib/sensors";
import { modules } from "@/modules";
import { SENSORLESS } from "@/widgets/module";
import { TEMPLATE_MODULES } from "@/widgets/registry";
import { fixtureSensors } from "@/widgets/__fixtures__";

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

describe("template zones with no data", () => {
  it("keeps an explicit allow-list of the templates that render without sensor keys", () => {
    expect([...SENSORLESS].sort()).toEqual(["Calendar", "Clock", "WaveLink", "WebPage"]);
  });

  it("hides every other template on an empty map and shows it with data", () => {
    const sensors = fixtureSensors();
    for (const mod of TEMPLATE_MODULES) {
      const p = place({ module: mod.id });
      expect(placementContent(p, {}, []).hasData, `${mod.id} empty`).toBe(SENSORLESS.has(mod.id));
      expect(placementContent(p, sensors, []).hasData, `${mod.id} fixture`).toBe(true);
    }
  });

  it("hides the legacy ids that alias a template like the template itself", () => {
    const alias = modules.find((m) => m.id === "fpsmodern")!;
    expect(placementContent(place({ module: alias.id }), {}, []).hasData).toBe(false);
  });
});

describe("Other sensors zone", () => {
  const unclaimed = [
    ["acme.temp", { value: 41.25, unit: "°C", name: "Acme Board Temp" }],
    ["acme.note", { text: "line one\nline two", unit: "" }],
  ] as never as Parameters<typeof placementContent>[2];
  const html = (extra: Partial<Placement> = {}) => {
    const r = placementContent(place({ module: CARDS_ID, colSpan: 4, ...extra }), {}, unclaimed);
    return renderToString(r.content as never);
  };

  it("renders each unclaimed sensor as a sensor widget, named by its display name or key", () => {
    const out = html();
    expect(out).toContain("Acme Board Temp");
    expect(out).toContain("41");
    expect(out).toContain("acme.note");
    expect(out).toContain("line one");
  });

  it("lays the cards out on the sub-grid column rule", () => {
    const cols = (colSpan: number) => html({ colSpan }).match(/repeat\((\d), minmax/)?.[1];
    expect([cols(2), cols(4), cols(8)]).toEqual(["2", "3", "4"]);
  });

  it("honours the zone's card settings (accent) and defaults to the theme surface", () => {
    expect(html({ settings: { accent: "#ff0000" } })).toContain("--accent:#ff0000");
    expect(html()).not.toContain("--accent:#ff0000");
    expect(html()).toContain("var(--card)");
    expect(html({ settings: { surface: "glass" } })).not.toContain("var(--card)");
  });

  it("keeps image values as images", () => {
    const pics = [["acme.cover_url", { text: "https://example.com/cover.png", unit: "" }]] as never as Parameters<typeof placementContent>[2];
    const out = renderToString(placementContent(place({ module: CARDS_ID }), {}, pics).content as never);
    expect(out).toContain('<img src="https://example.com/cover.png"');
  });

  it("has no data when nothing is unclaimed", () => {
    expect(placementContent(place({ module: CARDS_ID }), {}, []).hasData).toBe(false);
  });
});
