import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import legacy from "@/widgets/__fixtures__/legacy-settings.json";
import { enumValues, settingRow } from "@/widgets/__fixtures__/legacy-parity";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { fpsLookProps } from "@/widgets/fps-settings";
import { fpsModernModule } from "./fps-modern";
import type { ModuleSettings, SensorMap } from "./types";

const html = (sensors: SensorMap, saved?: ModuleSettings) => renderToString(fpsModernModule.render(sensors, saved) as never);
const LAYOUT_FOR_TIER = { xs: "simple", sm: "compact", md: "standard", lg: "card" } as const;

describe("fpsmodern (alias of FpsMonitor)", () => {
  it("keeps its id, size, prefixes and every setting key and default", () => {
    expect(fpsModernModule).toMatchObject({ id: "fpsmodern", title: "FPS (modern)", minCols: 2, minRows: 1, libraryHidden: true });
    expect(fpsModernModule.prefixes).toEqual(legacy.fpsKeys);
    expect((fpsModernModule.settings ?? []).map(settingRow)).toEqual(legacy.fps);
  });

  it("is idle without frames and live with them", () => {
    const idle = fpsModernModule.isIdle!;
    expect(idle({}, {})).toBe(true);
    expect(idle({ "plugins.InfoPanel.RTSS.rtss.fps": { value: 0, unit: "FPS" } }, {})).toBe(true);
    expect(idle({ "plugins.fps-plugin.fps.fps": { value: 60, unit: "FPS" } }, {})).toBe(false);
    expect(idle(fixtureSensors(), {})).toBe(false);
  });

  it("hides the section when neither source has anything", () => {
    expect(fpsModernModule.render({}, {})).toBeNull();
  });

  it.each(Object.entries(LAYOUT_FOR_TIER))("renders the fixture at %s (layout %s)", (_tier, layout) => {
    for (const variant of ["default", "studio"]) expect(html(fixtureSensors(), { layout, variant })).toMatch(/\d/);
  });

  it.each(enumValues(fpsModernModule))("renders %s = %s", (key, value) => {
    expect(html(fixtureSensors(), { [key]: value }).length).toBeGreaterThan(0);
  });

  it("shows the PresentMon metrics unless Extra metrics is off", () => {
    const sensors = { ...fixtureSensors(), "plugins.fps-plugin.fps.gpu utilization": { value: 91, unit: "%" } };
    expect(html(sensors, { layout: "card", showMetrics: true })).toContain("GPU util");
    expect(html(sensors, { layout: "card", showMetrics: false })).not.toContain("GPU util");
  });

  it("draws the ring and sparkline in the chosen colours", () => {
    const out = html(fixtureSensors(), { layout: "card", sparkline: true, ringColor: "#123456", sparkColor: "#abcdef" });
    expect(out).toContain("#123456");
    expect(out).toContain("#abcdef");
  });

  it("reads the PresentMon keys when RTSS is absent", () => {
    const sensors: SensorMap = {
      "plugins.fps-plugin.fps.fps": { value: 118, unit: "FPS" },
      "plugins.fps-plugin.fps.0.1% low": { value: 62, unit: "FPS" },
      "plugins.fps-plugin.fps.1% low": { value: 84, unit: "FPS" },
      "plugins.fps-plugin.fps.frame time": { value: 8.5, unit: "ms" },
      "plugins.fps-plugin.fps.gpu utilization": { value: 91, unit: "%" },
      "plugins.fps-plugin.fps.cpu busy": { value: 3.2, unit: "ms" },
      "plugins.fps-plugin.fps.windowtitle": { text: "Sample Game", unit: "" },
    };
    const out = html(sensors, { layout: "card" });
    for (const text of ["PresentMon", "118", "84", "8.5", "GPU util", "91%", "CPU busy", "3.2 ms", "62"]) expect(out).toContain(text);
  });
});

describe("fpsLookProps", () => {
  it.each([
    [{}, { view: undefined, showMetrics: false, sparkline: false, ringColor: "", sparkColor: "" }],
    [{ view: "trend", showMetrics: true, sparkline: true, ringColor: "#fff", sparkColor: "#000" }, { view: "trend", showMetrics: true, sparkline: true, ringColor: "#fff", sparkColor: "#000" }],
    [{ view: "gauge", showMetrics: false }, { view: "gauge", showMetrics: false, sparkline: false, ringColor: "", sparkColor: "" }],
  ])("maps %j", (stored, props) => {
    expect(fpsLookProps(stored as ModuleSettings)).toEqual(props);
  });
});
