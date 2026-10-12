import { describe, expect, it, vi } from "vitest";
import { hardwareModernModule, hardwareToProps } from "./hardware-modern";
import { expectRendersEverywhere, renderModule, settingPairs } from "./port-helpers";

// The settings (key, default) as they were before the module moved onto the widget shell.
const BEFORE: [string, unknown][] = [
  ["preset", "default"],
  ["layout", "auto"],
  ["surface", "glass"],
  ["label", ""],
  ["icon", ""],
  ["accent", ""],
  ["background", ""],
  ["backgroundOn", false],
  ["skin", "auto"],
  ["variant", "default"],
  ["graph", "auto"],
  ["meter", "auto"],
  ["compactView", "auto"],
  ["autoScale", true],
  ["scale", 100],
  ["alignX", "auto"],
  ["padding", "auto"],
  ["gap", "auto"],
  ["radius", "auto"],
  ["textColor", ""],
  ["mutedColor", ""],
  ["font", "auto"],
  ["fontWeight", "auto"],
  ["labelCase", "auto"],
  ["stroke", 100],
  ["customCss", ""],
  ["borderWidth", "auto"],
  ["borderColor", ""],
  ["glow", "none"],
  ["glowColor", ""],
  ["surfaceOpacity", 100],
  ["blur", "auto"],
  ["view", "list"],
  ["maxRows", 12],
  ["showFans", true],
  ["tempColor", ""],
  ["fanColor", ""],
  ["powerColor", ""],
];

const STORED = { view: "list", maxRows: 12, showFans: true, tempColor: "", fanColor: "", powerColor: "" };

describe("hardwaremodern", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(hardwareModernModule).toMatchObject({ id: "hardwaremodern", title: "Hardware (modern)", minCols: 2, minRows: 1, prefixes: ["libre.", "hwinfo."], libraryHidden: true });
    expect(hardwareModernModule.isIdle).toBeUndefined();
    expect(settingPairs(hardwareModernModule)).toEqual(BEFORE);
  });

  it.each([
    [{ view: "list" }, { gauges: false }],
    [{ view: "temps" }, { gauges: true }],
    [{ maxRows: 0 }, { maxRows: 0 }],
    [{ maxRows: 6 }, { maxRows: 6 }],
    [{ showFans: false }, { showFans: false }],
    [{ tempColor: "#111111" }, { tempColor: "#111111" }],
    [{ fanColor: "#222222" }, { fanColor: "#222222" }],
    [{ powerColor: "#333333" }, { powerColor: "#333333" }],
  ])("maps %j to the template props", (stored, props) => {
    expect(hardwareToProps({ ...STORED, ...stored })).toMatchObject(props);
  });

  it("renders the list at every forced size and both variants", () => {
    expectRendersEverywhere(hardwareModernModule, /\d/);
    expectRendersEverywhere(hardwareModernModule, /\d/, { view: "temps" });
  });

  it("lists hwinfo readings, temperatures first, each row keyed by its sensor key", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const html = renderModule(hardwareModernModule, { layout: "card", maxRows: 0 });
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
    expect(html).toContain("Cpu Package Temp");
    expect(html.indexOf("Cpu Package Temp")).toBeLessThan(html.indexOf("Cpu Fan"));
    expect(html.indexOf("Cpu Fan")).toBeLessThan(html.indexOf("Cpu Power"));
    expect(html.indexOf("Cpu Power")).toBeLessThan(html.indexOf("Vcore"));
  });

  it("renders the non-default values", () => {
    const list = (s: object) => renderModule(hardwareModernModule, { layout: "card", ...s });
    const rows = (html: string) => (html.match(/h-1\.5 w-1\.5 shrink-0 rounded-full/g) ?? []).length;
    expect(rows(list({ maxRows: 3 }))).toBe(3);
    expect(rows(list({ maxRows: 0 }))).toBeGreaterThan(3);
    expect(list({ tempColor: "#111111", fanColor: "#222222", powerColor: "#333333", maxRows: 0 })).toMatch(/#111111[\s\S]*#222222[\s\S]*#333333/);
    const temps = (s: object) => list({ view: "temps", ...s });
    expect(temps({})).toContain("RPM");
    expect(temps({ showFans: false })).not.toContain("RPM");
    expect(temps({ fanColor: "#222222" })).toContain("#222222");
    expect((temps({}).match(/stroke-dashoffset="/g) ?? []).length).toBe(4);
  });
});
