import { describe, expect, it } from "vitest";
import type { Placement } from "@/lib/layout";
import { zoneMinSize } from "@/components/studio/studio-actions";
import { moduleMinSize } from "@/components/studio/studio-modules";

const zone = (module: string, settings?: Placement["settings"]): Placement => ({ id: "z", module, colStart: 1, rowStart: 1, colSpan: 4, rowSpan: 2, visible: true, settings });

// A zone's minimum (resize, arrange, move to a page, the inspector's size line, assigning a widget) is its stored view's own
// where the view has one: FPS Monitor's pacing view is the Frame Pacing widget, whose minimum was 2x1 against FPS Monitor's 1x1.
describe("a zone's minimum size follows its view", () => {
  it("FPS Monitor is 1x1, its pacing view 2x1", () => {
    expect(zoneMinSize(zone("FpsMonitor"))).toEqual({ cols: 1, rows: 1 });
    expect(zoneMinSize(zone("FpsMonitor", { view: "gauge" }))).toEqual({ cols: 1, rows: 1 });
    expect(zoneMinSize(zone("FpsMonitor", { view: "pacing" }))).toEqual({ cols: 2, rows: 1 });
    expect(moduleMinSize("FpsMonitor", { view: "pacing" })).toEqual({ cols: 2, rows: 1 });
    expect(moduleMinSize("FpsMonitor")).toEqual({ cols: 1, rows: 1 });
  });

  it("a widget whose views set no minimum keeps its own, and a blank or unknown zone stays 1x1", () => {
    expect(zoneMinSize(zone("GpuMonitor", { view: "rings" }))).toEqual({ cols: 1, rows: 1 });
    expect(zoneMinSize(zone("Weather", { view: "forecast" }))).toEqual(zoneMinSize(zone("Weather")));
    expect(zoneMinSize(zone("SessionStats", { view: "lanes" }))).toEqual(zoneMinSize(zone("SessionStats")));
    expect(zoneMinSize(zone("KpiTiles", { view: "cards" }))).toEqual(zoneMinSize(zone("KpiTiles")));
    expect(zoneMinSize(zone("nope"))).toEqual({ cols: 1, rows: 1 });
  });
});
