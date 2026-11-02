import { describe, expect, it } from "vitest";
import { newBarSettings } from "@/components/studio/new-bar-settings";

describe("newBarSettings", () => {
  const island = { enabled: true, idle: "time" };
  it("starts a new bar's centre as the date when the island shows the time", () => {
    expect(newBarSettings("StatusBar", { view: "edge" }, island)).toEqual({ view: "edge", center: "date" });
    expect(newBarSettings("StatusBar", undefined, island)).toEqual({ center: "date" });
  });
  it("leaves the bar alone with no island, a hidden or line island, another widget, or a centre of its own", () => {
    expect(newBarSettings("StatusBar", { view: "edge" }, undefined)).toEqual({ view: "edge" });
    expect(newBarSettings("StatusBar", undefined, { enabled: false, idle: "time" })).toBeUndefined();
    expect(newBarSettings("StatusBar", { a: 1 }, { enabled: true, idle: "hidden" })).toEqual({ a: 1 });
    expect(newBarSettings("StatusBar", { a: 1 }, { enabled: true, idle: "line" })).toEqual({ a: 1 });
    expect(newBarSettings("Clock", { a: 1 }, island)).toEqual({ a: 1 });
    expect(newBarSettings("StatusBar", { center: "time" }, island)).toEqual({ center: "time" });
  });
});
