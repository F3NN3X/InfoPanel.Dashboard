import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { audioMeterProps, meterBridgeProps, volumeMixerProps } from "@/widgets/AudioModern";
import { audioModernModule, audioToProps } from "./audio-modern";
import { FORCED_LAYOUTS, VARIANTS, renderModule, settingPairs } from "./port-helpers";
import { STANDARD_SETTINGS } from "./standard-settings";
import type { SensorMap } from "./types";

// The module's own settings (key, default) as they were before it moved onto the widget shell.
const OWN_BEFORE: [string, unknown][] = [
  ["source", ""],
  ["view", "meter"],
  ["showDevice", true],
  ["showDetails", true],
  ["showVolume", false],
  ["showMute", true],
  ["meterVariant", "solid"],
  ["meterOrientation", "horizontal"],
  ["meterBallistics", "peak"],
  ["levelColor", ""],
  ["hotColor", ""],
];
const VOICE = "audio-meter-0-0-0-00000000-e2087318-05b8-4830-84b9-1e6e8852d2f9";
const MUTE_KEY = "plugins.volume-plugin.{0.0.0.00000000}.{e2087318-05b8-4830-84b9-1e6e8852d2f9}.mute";
const sensors = (): SensorMap => ({ ...fixtureSensors(), [MUTE_KEY]: { ...fixtureSensors()[MUTE_KEY], text: "True" } });

const DEFAULTS = { view: "meter", source: "", showDevice: true, showDetails: true, showVolume: false, showMute: true, meterVariant: "solid", meterOrientation: "horizontal", meterBallistics: "peak", levelColor: "", hotColor: "" };

describe("audiomodern", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(audioModernModule).toMatchObject({ id: "audiomodern", title: "Audio (modern)", minCols: 2, minRows: 1, prefixes: ["plugins.audio-level-meter."], libraryHidden: true });
    expect(audioModernModule.reads).toEqual(["plugins.volume-plugin."]);
    expect(audioModernModule.isIdle).toBeUndefined();
    const pairs = settingPairs(audioModernModule);
    expect(pairs.slice(0, STANDARD_SETTINGS.length)).toEqual(STANDARD_SETTINGS.map((s) => [s.key, s.default]));
    expect(pairs.slice(STANDARD_SETTINGS.length)).toEqual(OWN_BEFORE);
  });

  it("keeps the view presets and the device picker", () => {
    const by = (k: string) => audioModernModule.settings!.find((s) => s.key === k)!;
    expect(by("source")).toMatchObject({ optionsFrom: "sources", sourcePlugin: "plugins.audio-level-meter." });
    expect(by("view").options!.map((o) => o.value)).toEqual(["meter", "audiometer", "volume"]);
    expect(by("view").options![2].applies).toEqual({ showVolume: true, showMute: true, showDevice: true, showDetails: false });
    expect(by("meterVariant").options!.map((o) => o.value)).toEqual(["solid", "segmented", "gradient"]);
  });

  it.each([
    [{ view: "audiometer" }, { view: "audiometer" }],
    [{ view: "volume" }, { view: "volume" }],
    [{ view: "other" }, { view: "meter" }],
    [{ source: VOICE }, { source: VOICE }],
    [{ showDevice: false }, { showDevice: false }],
    [{ showDetails: false }, { showDetails: false }],
    [{ showVolume: true }, { showVolume: true }],
    [{ showMute: false }, { showMute: false }],
    [{ meterVariant: "segmented" }, { meterVariant: "segmented" }],
    [{ meterVariant: "gradient" }, { meterVariant: "gradient" }],
    [{ meterOrientation: "vertical" }, { meterOrientation: "vertical" }],
    [{ meterBallistics: "vu" }, { meterBallistics: "vu" }],
    [{ meterBallistics: "instant" }, { meterBallistics: "instant" }],
    [{ levelColor: "#112233" }, { levelColor: "#112233" }],
    [{ hotColor: "#445566" }, { hotColor: "#445566" }],
  ])("maps %j to the template props", (stored, props) => {
    expect(audioToProps({ ...DEFAULTS, ...stored })).toMatchObject(props);
  });

  it("routes each view to its template props", () => {
    const base = audioToProps(DEFAULTS);
    expect(audioMeterProps(base)).toMatchObject({ device: undefined, mode: "bridge", meterStyle: "solid", orientation: "horizontal", ballistics: "peak" });
    expect(audioMeterProps({ ...base, source: VOICE, meterVariant: "segmented", meterOrientation: "vertical" })).toMatchObject({ device: VOICE, mode: "single", meterStyle: "led", orientation: "vertical" });
    expect(audioMeterProps({ ...base, meterVariant: "gradient" }).meterStyle).toBe("bar");
    expect(meterBridgeProps({ ...base, source: VOICE })).toMatchObject({ channels: [VOICE], includeDefault: true, ladder: "smooth", showName: true, showVolume: true });
    expect(meterBridgeProps({ ...base, showDetails: false, showVolume: false, meterVariant: "segmented", meterOrientation: "vertical" })).toMatchObject({ channels: undefined, ladder: "led", orientation: "vertical", showVolume: false, showDetails: false });
    expect(volumeMixerProps({ ...base, source: VOICE, levelColor: "#fff" })).toMatchObject({ device: VOICE, showDevice: true, showMute: true, levelColor: "#fff" });
  });

  // SSR has no measured height, so a list shows its first row; the studio variant shows the widget's own label
  describe.each([
    ["meter", /Voice/, /Audio levels/],
    ["audiometer", /Voice/, /Levels/],
    ["volume", /Voice|Music|Headphones|Browser|System|Speakers|Wave Mic/, /Volume/],
  ])("view %s", (view, device, studio) => {
    it("renders at every forced size and both variants", () => {
      for (const layout of FORCED_LAYOUTS)
        for (const variant of VARIANTS) {
          const html = renderModule(audioModernModule, { layout, variant, view }, sensors());
          expect(html, `${layout}/${variant}`).toMatch(variant === "studio" ? studio : device);
        }
    });
  });

  it("renders the non-default values of each enum setting", () => {
    const one = { layout: "standard", source: VOICE };
    const html = (s: Record<string, string | number | boolean>) => renderModule(audioModernModule, { ...one, ...s }, sensors());
    // meter view: all devices as rows (horizontal) or columns (vertical); one device in its styles
    const all = renderModule(audioModernModule, { layout: "card", meterOrientation: "vertical" }, sensors());
    expect(all).toContain("flex-col-reverse");
    expect(all).toContain("Browser");
    expect(all).toContain("Default device");
    expect(html({ meterVariant: "segmented" })).toContain("opacity:0.14");
    expect(html({ meterVariant: "solid" })).not.toContain("opacity:0.14");
    expect(html({ meterVariant: "solid" })).not.toContain("linear-gradient(90deg");
    expect(html({ meterVariant: "gradient" })).toContain("linear-gradient(90deg");
    // pro view: smooth ladders for solid / gradient, LEDs for segmented
    expect(html({ view: "audiometer", meterVariant: "segmented" })).toContain("opacity:0.14");
    expect(html({ view: "audiometer", meterVariant: "solid" })).not.toContain("opacity:0.14");
    expect(html({ view: "audiometer", layout: "card", meterVariant: "gradient" })).toContain("linear-gradient");
    for (const meterBallistics of ["vu", "instant"]) expect(html({ meterBallistics }).length).toBeGreaterThan(0);
    // volume view with one device shows that device only
    const vol = html({ view: "volume" });
    expect(vol).toContain("Voice");
    expect(vol).not.toContain("Music");
  });

  it("honours the toggles and colours", () => {
    const base = { layout: "standard", source: VOICE };
    const html = (s: Record<string, string | number | boolean>) => renderModule(audioModernModule, { ...base, ...s }, sensors());
    expect(html({ showDevice: false })).not.toContain(">Voice<");
    expect(html({ showDetails: false })).not.toContain("RMS");
    expect(html({})).toContain("RMS");
    expect(html({ showMute: false })).not.toContain("Muted");
    expect(html({})).toContain("Muted");
    expect(html({ showVolume: true })).toContain(">Vol<");
    expect(html({ levelColor: "#112233", hotColor: "#445566" })).toMatch(/#112233/);
    expect(html({ meterVariant: "segmented", levelColor: "#112233", hotColor: "#445566" })).toMatch(/#445566/);
    expect(renderModule(audioModernModule, { layout: "card", view: "audiometer", showMute: true }, sensors())).toContain(">M<");
    expect(renderModule(audioModernModule, { layout: "card", view: "audiometer", showMute: false }, sensors())).not.toContain(">M<");
  });
});
