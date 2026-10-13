import { createElement, type ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import NowPlaying, { levelDevice } from "@/widgets/NowPlaying";
import { toFlat } from "@/widgets/data-adapter";
import { legacyPropsOf } from "@/widgets/NowPlaying/settings";
import { GROUP_C } from "@/widgets/registry/c";
import { mediaModernModule, spotifyModernModule } from "./modern-media";
import before from "./modern-media.settings.json";
import { effectiveSettings, type DashboardModule, type ModuleSettings, type SensorMap } from "./types";

const MODULES = [spotifyModernModule, mediaModernModule];
const sensors = fixtureSensors();
const render = (mod: DashboardModule, settings: ModuleSettings = {}, data: SensorMap = sensors) =>
  renderToString(mod.render(data, settings) as ReactElement);
const text = (html: string) => html.replace(/<[^>]*>/g, " ");

// The settings as they were before the port (captured from the legacy module), field by field.
const shape = (mod: DashboardModule) =>
  JSON.parse(
    JSON.stringify(
      (mod.settings ?? []).map((s) => ({ key: s.key, default: s.default, type: s.type, group: s.group, tab: s.tab, advanced: s.advanced, options: s.options?.map((o) => o.value), min: s.min, max: s.max, step: s.step, optionsFrom: s.optionsFrom, multiple: s.multiple, label: s.label }))
    )
  );

describe("legacy media modules", () => {
  it("keep every stored key, default, option and group, then add playerLayout", () => {
    for (const mod of MODULES) {
      const now = shape(mod);
      expect(now.slice(0, before.spotify.length), mod.id).toEqual(before.spotify);
      expect(now.slice(before.spotify.length).map((s: { key: string; default: unknown }) => [s.key, s.default])).toEqual([["playerLayout", "card"]]);
    }
  });

  it("keep id, title, minimum size and data prefixes; hidden from the Library", () => {
    expect(MODULES.map((m) => ({ id: m.id, title: m.title, minCols: m.minCols, minRows: m.minRows, prefixes: m.prefixes, reads: m.reads }))).toEqual(before.meta);
    for (const mod of MODULES) {
      expect(mod.libraryHidden).toBe(true);
      expect(mod.category).toBeUndefined();
    }
  });

  describe("isIdle (unchanged: idle unless playback-state is 2)", () => {
    const at = (key: string, value: number): SensorMap => ({ [key]: { value, unit: "" } });
    it("media", () => {
      expect(mediaModernModule.isIdle!(sensors, {})).toBe(false);
      expect(mediaModernModule.isIdle!(at("plugins.media-plugin.media.playback-state", 4), {})).toBe(true);
      expect(mediaModernModule.isIdle!({}, {})).toBe(true);
    });
    it("spotify reads the pushed key first", () => {
      expect(spotifyModernModule.isIdle!(sensors, {})).toBe(false);
      expect(spotifyModernModule.isIdle!(at("plugins.spotify-plugin.spotify.playback-state", 2), {})).toBe(false);
      expect(spotifyModernModule.isIdle!({ ...at("plugins.spotify-plugin.spotify.playback-state", 2), ...at("spotify.playing", 1) }, {})).toBe(true);
      expect(spotifyModernModule.isIdle!({}, {})).toBe(true);
    });
  });

  describe("toProps", () => {
    const props = (s: ModuleSettings) => legacyPropsOf(effectiveSettings(spotifyModernModule, s), "spotify");
    const cases: [string, ModuleSettings, Record<string, unknown>][] = [
      ["defaults", {}, { source: "spotify", progress: "bar", vizMode: "bars", vizDevice: "", layout: "card", showTimes: true, showProgress: true, tint: true, artBackground: false, captureDevices: undefined }],
      ["showTimes", { showTimes: false }, { showTimes: false }],
      ["showProgress", { showProgress: false }, { showProgress: false }],
      ["tint", { tint: false }, { tint: false }],
      ["artBackground", { artBackground: true }, { artBackground: true }],
      // the live waveform scrolls by default
      ["waveform", { waveform: true }, { progress: "visualizer", vizMode: "scroll" }],
      ["waveform static", { waveform: true, waveformMode: "static" }, { vizMode: "bars" }],
      ["waveformVariant", { waveform: true, waveformMode: "static", waveformVariant: "line" }, { vizMode: "line" }],
      ["waveformVariant scrolling", { waveform: true, waveformVariant: "line" }, { vizMode: "scroll", vizLook: { scrollAs: "line" } }],
      ["visualizer", { visualizer: true }, { progress: "visualizer", vizMode: "bars" }],
      ["visualizer wins over waveform", { visualizer: true, waveform: true, waveformVariant: "line" }, { vizMode: "bars" }],
      ["visualizerMirrored", { visualizer: true, visualizerMirrored: true }, { vizMode: "mirror" }],
      ["waveformSensitivity", { waveformSensitivity: 2.5 }, { vizLook: { gain: 2.5 } }],
      ["visualizerBarCount", { visualizerBarCount: 40 }, { vizLook: { count: 40 } }],
      ["visualizerAlign", { visualizerAlign: "end" }, { vizLook: { align: "end" } }],
      ["visualizerMinLevel", { visualizerMinLevel: 0.2 }, { vizLook: { minLevel: 0.2 } }],
      ["visualizerOrientation", { visualizerOrientation: "vertical" }, { vizLook: { orientation: "vertical" } }],
      ["waveformBarWidth", { waveformBarWidth: 6 }, { vizLook: { gap: 1 / 7 } }],
      ["waveformBarGap", { waveformBarGap: 3 }, { vizLook: { gap: 0.5 } }],
      ["waveformBarRadius", { waveformBarRadius: 0 }, { vizLook: { shape: "square" } }],
      ["waveformMinBarHeight", { waveformMinBarHeight: 10 }, { vizLook: { minPx: 10 } }],
      ["waveformLineWidth", { waveformLineWidth: 3 }, { vizLook: { lineWidth: 3 } }],
      ["waveformFadeEdges", { waveformFadeEdges: false }, { vizLook: { fade: 0 } }],
      ["waveformFadeWidth", { waveformFadeWidth: 80 }, { vizLook: { fade: 80 } }],
      ["liveSource", { liveSource: "dev-1" }, { vizDevice: "dev-1" }],
      ["liveCapture without devices", { liveCapture: true }, { captureDevices: undefined }],
      ["liveSources without liveCapture", { liveSources: "a,b" }, { captureDevices: undefined }],
      ["liveCapture + liveSources", { liveCapture: true, liveSources: " a , b ," }, { captureDevices: ["a", "b"] }],
      ["playerLayout", { playerLayout: "vinyl" }, { layout: "vinyl" }],
    ];
    for (const [name, s, expected] of cases) it(name, () => expect(props(s)).toMatchObject(expected));

    it("ignores the synthesised idle animations (saved values are unused, no error)", () => {
      const base = props({ visualizer: true });
      expect(props({ visualizer: true, visualizerIdle: "pulse", visualizerLoading: true, waveformActive: false })).toEqual(base);
    });

    it("keeps the skin's bar shape and the default gap while the hidden shape keys sit at their defaults", () => {
      const look = props({})?.vizLook ?? {};
      expect([look.shape, look.gap, look.minPx]).toEqual([undefined, undefined, undefined]);
    });

    it("the media module fixes its source", () => {
      expect(legacyPropsOf(effectiveSettings(mediaModernModule, {}), "media").source).toBe("media");
    });
  });

  describe("renders through the NowPlaying template", () => {
    const LAYOUTS = { xs: "simple", sm: "compact", md: "standard", lg: "card" };
    for (const mod of MODULES)
      for (const [tier, layout] of Object.entries(LAYOUTS))
        for (const variant of ["default", "studio"])
          it(`${mod.id} ${tier} ${variant}`, () => {
            const html = render(mod, { layout, variant });
            expect(text(html)).toContain("Sample Track");
          });

    it("shows the times and the progress by default, hides them when off", () => {
      const on = render(mediaModernModule, { layout: "standard" });
      expect(text(on)).toContain("01:34");
      expect(on).toContain("width:42%");
      expect(text(render(mediaModernModule, { layout: "standard", showTimes: false }))).not.toContain("01:34");
      const off = render(mediaModernModule, { layout: "standard", showProgress: false });
      expect(off).not.toContain("width:42%");
      expect(text(off)).not.toContain("01:34");
    });

    it.each(MODULES)("$id at 2x1 keeps the cover tile, title, artist and the elapsed / total time", (mod) => {
      const html = render(mod, { layout: "simple" });
      for (const part of ["Sample Track", "Sample Artist", "01:34 / 02:11", "/assets/qa/cover.svg"]) expect(html).toContain(part);
      expect(render(mod, { layout: "simple", showTimes: false })).not.toContain("01:34 / 02:11");
    });

    it("draws the live waveform as the scrolling style, the bar visualizer as bars", () => {
      expect(render(mediaModernModule, { layout: "standard", waveform: true })).toContain('data-viz="scroll"');
      const bars = render(mediaModernModule, { layout: "standard", waveform: true, visualizer: true, visualizerBarCount: 12 });
      expect(bars.match(/<canvas[^>]*data-viz="bars"/g)).toHaveLength(1);
    });

    it("renders one live row per pinned capture device", () => {
      const html = render(mediaModernModule, { layout: "standard", visualizer: true, liveCapture: true, liveSources: "dev-a,dev-b" });
      expect(text(html)).toContain("dev-a");
      expect(text(html)).toContain("dev-b");
    });

    it("draws the blurred cover art behind the content", () => {
      expect(render(mediaModernModule, { layout: "standard", artBackground: true })).toContain("blur(28px)");
      expect(render(mediaModernModule, { layout: "standard" })).not.toContain("blur(28px)");
    });

    // one render per non-default value of each enum setting
    const ENUMS: ModuleSettings[] = [
      { waveform: true, waveformVariant: "line" },
      { waveform: true, waveformVariant: "mirror" },
      { waveform: true, waveformMode: "static" },
      { visualizer: true, visualizerAlign: "start" },
      { visualizer: true, visualizerAlign: "end" },
      { visualizer: true, visualizerIdle: "pulse" },
      { visualizer: true, visualizerIdle: "wave" },
      { visualizer: true, visualizerOrientation: "vertical" },
      { playerLayout: "vinyl" },
      { playerLayout: "backdrop" },
      { playerLayout: "wave" },
    ];
    for (const s of ENUMS)
      it(`renders ${JSON.stringify(s)}`, () => {
        for (const mod of MODULES) expect(text(render(mod, { layout: "card", ...s }))).toContain("Sample Track");
      });
  });
});

describe("NowPlaying template module", () => {
  const mod = GROUP_C.find((m) => m.id === "NowPlaying")!;

  it("offers the new props, stores the layout as playerLayout and draws untinted by default", () => {
    const keys = (mod.settings ?? []).map((s) => s.key);
    for (const k of ["playerLayout", "showTimes", "showProgress", "tint", "artBackground", "visualizerBarCount", "waveformSensitivity", "waveformFadeEdges", "liveCapture", "liveSources", "vizColorMode", "vizShape", "vizPeaks", "vizFloorDb"]) expect(keys).toContain(k);
    // the engine picker, the old shape keys and the synthesised idle animations are read, not offered
    for (const k of ["waveform", "visualizer", "visualizerMirrored", "vizEngine", "waveformMode", "waveformBarWidth", "waveformBarGap", "waveformBarRadius", "waveformMinBarHeight", "waveformActive", "visualizerIdle", "visualizerLoading"]) expect(keys).not.toContain(k);
    expect(mod.settings?.find((s) => s.key === "tint")?.default).toBe(false);
  });

  it("renders the one visualiser canvas in the picked style", () => {
    const html = renderToString(createElement(NowPlaying, { data: toFlat(sensors), progress: "visualizer", vizMode: "scroll", size: "md" }));
    expect(html).toContain('data-viz="scroll"');
  });

  it("labels the wave progress row as track progress", () => {
    const progress = mod.settings?.find((s) => s.key === "progress");
    expect(progress?.options?.find((o) => o.value === "wave")?.label).toBe("Wavy progress bar");
  });
});

describe("levelDevice", () => {
  const d = {
    "plugins.audio-level-meter.quiet.audio-level": "5 %",
    "plugins.audio-level-meter.loud.audio-level": "60 %",
  };
  it("defaults to default-audio when unset", () => expect(levelDevice(d, undefined)).toBe("default-audio"));
  it("takes the loudest live device for an empty pick", () => expect(levelDevice(d, "")).toBe("loud"));
  it("keeps a pinned device while it reports", () => expect(levelDevice(d, "quiet")).toBe("quiet"));
  it("falls back to the loudest when the pinned device is gone", () => expect(levelDevice(d, "gone")).toBe("loud"));
  it("counts an entry the plugin names Level when the key says nothing", () => {
    const named = { "plugins.audio-level-meter.quiet.audio-level": "5 %", "plugins.audio-level-meter.virtual.x9": "80 %" };
    expect(levelDevice(named, "")).toBe("quiet");
    expect(levelDevice(named, "", { "plugins.audio-level-meter.virtual.x9": "Level" })).toBe("virtual");
  });
});
