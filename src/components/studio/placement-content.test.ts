import { describe, expect, it } from "vitest";
import { placementPrefixes } from "./placement-content";
import { BLANK_MODULE, CARDS_ID, type Placement } from "@/lib/layout";
import { YR_FORECAST_KEY } from "@/lib/sensors";

const place = (extra: Partial<Placement>): Placement =>
  ({ id: "p", module: "", col: 1, row: 1, colSpan: 2, rowSpan: 1, visible: true, ...extra }) as Placement;

describe("placementPrefixes", () => {
  it("reads a module's owned and read prefixes", () => {
    expect(placementPrefixes(place({ module: "systemmodern" }))).toEqual(["system.cpu.", "system.ram."]);
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
