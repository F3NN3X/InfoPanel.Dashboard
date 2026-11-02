import { describe, expect, it } from "vitest";
import { isVisible } from "@/components/studio/inspector-model";
import { modules } from "@/modules";
import { effectiveSettings, type ModuleSettings } from "@/modules/types";
import { MIXER_LOOK } from "@/widgets/core/mixer-look";
import { mixerLookOf } from "@/widgets/registry/audio-settings";


// The mixer widgets' views (D-21): saved widgets from before them keep the rows view, and every option reads back.
// Drawing each view is `tests/widgets/mixer-views.test.tsx` (happy-dom, with a measured zone: server rendering
// measures 0 x 0, so it would only ever draw the rows).
const MIXERS = [
  ["StreamMixer", "orientation"],
  ["VolumeMixer", "orientation"],
  ["WaveLink", "meterOrientation"],
] as const;

describe.each(MIXERS)("%s view settings", (id, orientationKey) => {
  const mod = modules.find((m) => m.id === id)!;
  const shown = (values: ModuleSettings) => (mod.settings ?? []).filter((d) => isVisible(d, { ...effectiveSettings(mod, {}), ...values })).map((d) => d.key);

  it("reads a saved widget with no view keys, and the schema defaults, as the rows view with the documented defaults", () => {
    expect(mixerLookOf({}, orientationKey)).toEqual(MIXER_LOOK);
    expect(mixerLookOf(effectiveSettings(mod, {}), orientationKey)).toEqual(MIXER_LOOK);
  });

  it("round-trips every option and reads an unknown value as its default", () => {
    const saved: ModuleSettings = {
      view: "strips",
      [orientationKey]: "horizontal",
      stripVariant: "ghost",
      stripSize: "lg",
      stripAccent: false,
      stripIcon: false,
      stripSub: false,
      stripStatus: true,
      stripMeter: false,
      faderVariant: "console",
      faderRange: false,
      faderScale: false,
      scaleLabels: false,
      scaleSide: "end",
      scaleTicks: "0, -6, -20",
      faderTaper: "audio",
      faderStep: 5,
      faderWheel: true,
      stripLcd: false,
      lcdVariant: "amber",
      lcdAppearance: "light",
      lcdSize: "lg",
      lcdMatrix: false,
      lcdScanlines: false,
      lcdStatus: false,
    };
    const look = mixerLookOf(JSON.parse(JSON.stringify(saved)), orientationKey);
    expect(look).toEqual({ view: "strips", vertical: false, stripVariant: "ghost", stripSize: "lg", accent: false, icon: false, sub: false, status: true, meter: false, faderVariant: "console", range: false, scale: false, scaleLabels: false, scaleSide: "end", ticks: [0, -6, -20], taper: "audio", step: 5, wheel: true, lcd: false, lcdVariant: "amber", lcdAppearance: "light", lcdSize: "lg", lcdMatrix: false, lcdScanlines: false, lcdStatus: false });
    const odd = mixerLookOf({ view: "knobs", stripSize: "xl", lcdVariant: "pink", faderStep: 99, scaleTicks: "a, b" }, orientationKey);
    expect(odd).toMatchObject({ view: "rows", stripSize: "default", lcdVariant: "primary", step: 10, ticks: undefined });
  });

  it("shows the strip and fader rows in Strips only, and the LCD rows in LCD and in Strips with the readout", () => {
    expect(shown({})).not.toContain("stripVariant");
    expect(shown({})).not.toContain("lcdVariant");
    expect(shown({ view: "strips" })).toEqual(expect.arrayContaining(["stripVariant", "faderVariant", "faderScale", "lcdVariant"]));
    expect(shown({ view: "strips", stripLcd: false })).not.toContain("lcdVariant");
    expect(shown({ view: "strips", faderScale: false })).not.toContain("scaleSide");
    expect(shown({ view: "lcd" })).toContain("lcdVariant");
    expect(shown({ view: "lcd" })).not.toContain("faderVariant");
  });
});

describe("the fader options", () => {
  const keys = (id: string) => (modules.find((m) => m.id === id)!.settings ?? []).map((d) => d.key);

  it("offers the step and the wheel on the writable StreamMixer only, and the law on Wave Link's dB faders only", () => {
    expect(keys("StreamMixer")).toEqual(expect.arrayContaining(["faderStep", "faderWheel"]));
    expect(keys("VolumeMixer")).not.toContain("faderStep");
    expect(keys("WaveLink")).not.toContain("faderWheel");
    expect(keys("WaveLink")).toContain("faderTaper");
    expect(keys("StreamMixer")).not.toContain("faderTaper");
  });

  it("keeps the StreamMixer LED / bar fader to the rows view", () => {
    const mod = modules.find((m) => m.id === "StreamMixer")!;
    const fader = mod.settings!.find((d) => d.key === "fader")!;
    expect(isVisible(fader, effectiveSettings(mod, {}))).toBe(true);
    expect(isVisible(fader, { ...effectiveSettings(mod, {}), view: "strips" })).toBe(false);
  });
});
