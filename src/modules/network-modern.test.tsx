import { describe, expect, it } from "vitest";
import { networkModernModule, networkToProps } from "./network-modern";
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
  ["view", "speeds"],
  ["showTotals", true],
  ["sparkline", false],
  ["downloadColor", ""],
  ["uploadColor", ""],
];

describe("networkmodern", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(networkModernModule).toMatchObject({ id: "networkmodern", title: "Network (modern)", minCols: 2, minRows: 1, prefixes: ["libre.ethernet_"], libraryHidden: true });
    expect(networkModernModule.isIdle).toBeUndefined();
    expect(settingPairs(networkModernModule)).toEqual(BEFORE);
  });

  it.each([
    [{ view: "speeds" }, { view: "speeds" }],
    [{ view: "totals" }, { view: "totals" }],
    [{ showTotals: false }, { showTotals: false }],
    [{ sparkline: true }, { sparkline: true }],
    [{ downloadColor: "#ff0000" }, { downloadColor: "#ff0000" }],
    [{ uploadColor: "#00ff00" }, { uploadColor: "#00ff00" }],
  ])("maps %j to the template props", (stored, props) => {
    expect(networkToProps({ view: "speeds", showTotals: true, sparkline: false, downloadColor: "", uploadColor: "", ...stored })).toMatchObject(props);
  });

  it("renders at every forced size and both variants", () => {
    expectRendersEverywhere(networkModernModule, /MB\/s|GB\/s|KB\/s/);
  });

  it("renders the non-default values", () => {
    const totals = renderModule(networkModernModule, { layout: "compact", view: "totals" });
    expect(totals).toContain("Downloaded");
    expect(renderModule(networkModernModule, { layout: "standard", showTotals: false })).not.toContain("Downloaded");
    expect(renderModule(networkModernModule, { layout: "standard", downloadColor: "#ff0000", uploadColor: "#00ff00" })).toMatch(/#ff0000[\s\S]*#00ff00|#00ff00[\s\S]*#ff0000/i);
    expect(renderModule(networkModernModule, { layout: "card", sparkline: true })).toContain("<svg");
  });

  it("keeps the upload speed, the upload arrow and the legacy colours at 2x1 and up", () => {
    const xs = renderModule(networkModernModule, { layout: "simple" });
    expect(xs).toMatch(/lucide-arrow-down[\s\S]*lucide-arrow-up/);
    expect(xs).not.toContain("circle-dashed");
    expect(xs.match(/\d+(\.\d+)? (KB|MB|GB)\/s/g)).toHaveLength(2);
    expect(xs).toContain("#34d399");
    expect(xs).toContain("#60a5fa");
    const md = renderModule(networkModernModule, { layout: "standard" });
    expect(md).toContain("Download");
    expect(md).toContain("Upload");
  });
});
