import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WL_ABSENT, WL_LIVE } from "@/widgets/__fixtures__/wavelink";
import type { Opts } from "@/widgets/WaveLink";
import { WaveLinkLayout } from "@/widgets/WaveLink";
import { FORCED_LAYOUTS, VARIANTS, renderModule, settingPairs } from "./port-helpers";
import { STANDARD_SETTINGS } from "./standard-settings";
import { LEGACY_METER_OK, wavelinkModernModule, wavelinkToProps } from "./wavelink-modern";

// The Wave Link client is a singleton over an EventSource: the widget gets a connected one.
const live = vi.hoisted(() => ({ absent: false }));
vi.mock("@/lib/wavelink", async (orig) => {
  const fx = await import("@/widgets/__fixtures__/wavelink");
  return { ...(await orig<typeof import("@/lib/wavelink")>()), ...fx.wavelinkMock(), useWavelinkState: () => (live.absent ? fx.WL_ABSENT : fx.WL_LIVE) };
});

// The module's own settings (key, default) as they were before it moved onto the widget shell.
const OWN_BEFORE: [string, unknown][] = [
  ["source", ""],
  ["showReadout", true],
  ["showFader", true],
  ["showMixes", true],
  ["meterVariant", "solid"],
  ["meterOrientation", "vertical"],
  ["meterBallistics", "peak"],
  ["liveColor", ""],
  ["muteColor", ""],
];
const DEFAULTS = { source: "", showReadout: true, showFader: true, showMixes: true, meterVariant: "solid", meterOrientation: "vertical", meterBallistics: "peak", liveColor: "", muteColor: "" };
const O: Opts = { readout: true, fader: true, mixes: true, variant: "solid", preset: "peak" };

describe("wavelinkmodern", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(wavelinkModernModule).toMatchObject({ id: "wavelinkmodern", title: "Wave Link (modern)", minCols: 2, minRows: 1, prefixes: [], libraryHidden: true });
    expect(wavelinkModernModule.isIdle).toBeUndefined();
    const pairs = settingPairs(wavelinkModernModule);
    expect(pairs.slice(0, STANDARD_SETTINGS.length)).toEqual(STANDARD_SETTINGS.map((s) => [s.key, s.default]));
    expect(pairs.slice(STANDARD_SETTINGS.length)).toEqual(OWN_BEFORE);
  });

  it("keeps the multi meter picker fed by the Wave Link inventory", () => {
    expect(wavelinkModernModule.settings!.find((s) => s.key === "source")).toMatchObject({ type: "select", multiple: true, optionsFrom: "wavelink", default: "" });
  });

  it.each([
    [{ source: "channel:music,device:mic1" }, { source: "channel:music,device:mic1" }],
    [{ showReadout: false }, { showReadout: false }],
    [{ showFader: false }, { showFader: false }],
    [{ showMixes: false }, { showMixes: false }],
    [{ meterVariant: "segmented" }, { meterVariant: "segmented" }],
    [{ meterVariant: "gradient" }, { meterVariant: "gradient" }],
    [{ meterOrientation: "horizontal" }, { meterOrientation: "horizontal" }],
    [{ meterBallistics: "vu" }, { ballistics: "vu" }],
    [{ meterBallistics: "instant" }, { ballistics: "instant" }],
    [{ liveColor: "#00ff00" }, { liveColor: "#00ff00" }],
    [{ muteColor: "#ff0000" }, { muteColor: "#ff0000" }],
  ])("maps %j to the template props", (stored, props) => {
    expect(wavelinkToProps({ ...DEFAULTS, ...stored })).toMatchObject(props);
  });

  it("renders at every forced size and both variants, from the client rather than sensor keys", () => {
    for (const layout of FORCED_LAYOUTS)
      for (const variant of VARIANTS) {
        const html = renderModule(wavelinkModernModule, { layout, variant }, {});
        expect(html, `${layout}/${variant}`).toMatch(variant === "studio" ? /Wave Link/ : /Music/);
      }
  });

  it("renders the non-default values of each enum setting", () => {
    const html = (s: Record<string, string | number | boolean>) => renderModule(wavelinkModernModule, { layout: "standard", ...s }, {});
    expect(html({ meterVariant: "segmented" })).toContain("opacity:0.14");
    expect(html({ meterVariant: "solid" })).not.toContain("opacity:0.14");
    expect(html({ meterVariant: "gradient" })).toContain("linear-gradient");
    for (const meterBallistics of ["vu", "instant"]) expect(html({ meterBallistics }).length).toBeGreaterThan(0);
    expect(html({ meterOrientation: "horizontal" })).toContain("Music");
    expect(html({ liveColor: "#00ff00", muteColor: "#ff0000" })).toMatch(/--wl-live:#00ff00;--wl-mute:#ff0000/);
  });

  it("honours the toggles and the meter picker", () => {
    const html = (s: Record<string, string | number | boolean>) => renderModule(wavelinkModernModule, { layout: "card", ...s }, {});
    expect(html({})).toContain("80%");
    expect(html({ showFader: false })).not.toContain("80%");
    expect(html({ source: "channel:game" })).not.toContain("Music");
    expect(html({ source: "channel:game" })).toContain("Game");
  });

  describe("layout", () => {
    const layout = (p: Partial<Parameters<typeof WaveLinkLayout>[0]>) =>
      renderToString(createElement(WaveLinkLayout, { size: "lg", w: 900, h: 420, up: true, state: WL_LIVE, channels: WL_LIVE.channels, devices: WL_LIVE.devices, o: O, vertical: true, ...p }));

    it("lays mixer columns, the device column and the mixes footer out in a large zone", () => {
      const html = layout({});
      expect(html).toContain("Music");
      expect(html).toContain("Game");
      expect(html).toContain("Devices");
      expect(html).toContain("Wave:3");
      expect(html).toContain("Mixes");
      expect(html).toContain("Stream Mix");
      expect(html).toContain("−12");
    });
    it("drops to a row per channel when horizontal or too short", () => {
      expect(layout({ vertical: false })).not.toContain("Devices");
      expect(layout({ h: 100 })).not.toContain("Devices");
    });
    it("hides readouts, faders and mixes on request", () => {
      const html = layout({ o: { ...O, readout: false, fader: false, mixes: false } });
      expect(html).not.toContain("−12");
      expect(html).not.toContain("80%");
      expect(html).not.toContain("Mixes");
      expect(html).not.toContain("Stream Mix");
    });
    it("marks muted channels and dims an app that is not running but keeps its inventory", () => {
      expect(layout({})).toContain(">M<");
      const gone = layout({ up: false, state: { ...WL_ABSENT, channels: WL_LIVE.channels } });
      expect(gone).toContain("opacity-60");
      expect(gone).toContain("Music");
    });
    it("says so when there is nothing to show", () => {
      expect(layout({ up: false, channels: [], devices: [] })).toContain("Wave Link is not running");
      expect(layout({ channels: [], devices: [] })).toContain("No channels");
    });
  });

  describe("parity at small spans", () => {
    const names = ["Wave Mic 1", "Voice", "Browser", "Music", "Game"];
    const five = names.map((n, i) => ({ ...WL_LIVE.channels[0], id: `c${i}`, name: n, level: [0.85, 0.5, 0.23, 0.07, 0.4][i], isMuted: false }));
    const lay = (p: Partial<Parameters<typeof WaveLinkLayout>[0]>) =>
      renderToString(createElement(WaveLinkLayout, { size: "xs", w: 210, h: 90, up: true, state: WL_LIVE, channels: five, devices: [], o: O, vertical: true, ...p }));

    it("lists three channels with their fader at 2x1", () => {
      const html = lay({});
      for (const n of names.slice(0, 3)) expect(html).toContain(n);
      for (const v of ["85%", "50%", "23%"]) expect(html).toContain(v);
    });
    it("lists all five channels at 3x2 and 4x2 instead of the columns that fit", () => {
      for (const [w, h] of [[310, 150], [440, 150]]) {
        const html = lay({ size: "md", w, h });
        for (const n of names) expect(html, `${w}/${n}`).toContain(n);
      }
    });
    it("keeps the mixer columns when they hold every channel", () => {
      const html = lay({ size: "lg", w: 900, h: 420, channels: five.slice(0, 3) });
      expect(html).toContain("L</span>");
      expect(html).toContain("−12");
    });
    it("shows the dB readout in the dense rows only where there is width", () => {
      expect(lay({ size: "md", w: 310, h: 150 })).toMatch(/-11 -11|-12 -6|-∞/);
      expect(lay({ size: "md", w: 250, h: 150 })).not.toMatch(/font-mono/);
    });
    it("meters the alias in the legacy teal and keeps the accent for the template", () => {
      expect(renderModule(wavelinkModernModule, { layout: "standard", meterVariant: "segmented" }, {})).toContain(LEGACY_METER_OK);
    });
  });

  it("shows not running when the client is absent", () => {
    live.absent = true;
    try {
      expect(renderModule(wavelinkModernModule, { layout: "standard" }, {})).toContain("Not running");
    } finally {
      live.absent = false;
    }
  });
});
