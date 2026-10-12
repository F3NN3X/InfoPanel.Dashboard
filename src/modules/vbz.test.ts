import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
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

  it("renders nothing without plugin data", () => {
    expect(vbzModule.render({}, {})).toBeNull();
  });

  it("keeps the Theme card surface default", () => {
    expect(effectiveSettings(vbzModule).surface).toBe("theme");
  });
});
