import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { toFlat } from "@/widgets/data-adapter";
import Departures from "@/widgets/Departures";
import { departuresOptions } from "@/widgets/registry/e";
import { vbzModule } from "./vbz";
import { effectiveSettings, type ModuleSettings } from "./types";

const html = (s: ModuleSettings) => renderToString(vbzModule.render(fixtureSensors(), s) as never);

describe("vbz", () => {
  it.each([
    [{}, { showStatus: true }],
    [{ showStatus: false }, { showStatus: false }],
  ])("maps %j", (saved, expected) => {
    expect(departuresOptions.toProps(effectiveSettings(vbzModule, saved))).toEqual(expected);
  });

  it("lists the departures as time, line and destination under the station", () => {
    const out = html({ layout: "card" });
    expect(out).toContain("Zürich, Bahnhofplatz");
    for (const text of ["2 min", "Frankenstrasse", "Bahnhofquai", "Auzelg"]) expect(out).toContain(text);
    expect(out).toContain("Updated 12:04");
  });

  it("hides the status line with showStatus off", () => {
    expect(html({ layout: "card", showStatus: false })).not.toContain("Updated 12:04");
  });

  it("keeps the next departure and the status line at 2x1, and no scroll container or wrapping time", () => {
    const xs = renderToString(createElement(Departures, { data: toFlat(fixtureSensors()), size: "xs" }));
    for (const text of ["2 min", "Updated 12:04", "Zürich, Bahnhofplatz"]) expect(xs).toContain(text);
    expect(renderToString(createElement(Departures, { data: toFlat(fixtureSensors()), size: "xs", showStatus: false }))).not.toContain("Updated 12:04");
    const lg = html({ layout: "card" });
    expect(lg).not.toContain("overflow-y-auto");
    expect(lg).toContain("whitespace-nowrap");
  });

  it("renders nothing without plugin data", () => {
    expect(vbzModule.render({}, {})).toBeNull();
  });

  it("keeps the Theme card surface default", () => {
    expect(effectiveSettings(vbzModule).surface).toBe("theme");
  });
});
