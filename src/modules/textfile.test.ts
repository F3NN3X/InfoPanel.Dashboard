import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { textFileOptions } from "@/widgets/registry/e";
import { textfileModule } from "./textfile";
import { effectiveSettings, type ModuleSettings } from "./types";

const html = (s: ModuleSettings) => renderToString(textfileModule.render(fixtureSensors(), s) as never);

describe("textfile", () => {
  it.each([
    [{}, { showMeta: true }],
    [{ showMeta: false }, { showMeta: false }],
  ])("maps %j", (saved, expected) => {
    expect(textFileOptions.toProps(effectiveSettings(textfileModule, saved))).toEqual(expected);
  });

  it("shows the content and the header from the plugin entries", () => {
    const out = html({ layout: "card" });
    expect(out).toContain("Release notes");
    expect(out).toContain("2.0 KB");
    expect(out).toContain("5 lines");
    expect(out).toContain("OK");
  });

  it("drops the header with showMeta off", () => {
    expect(html({ layout: "card", showMeta: false })).not.toContain("5 lines");
  });

  it("keeps the title, size, line count, status and the text at 2x1", () => {
    const out = html({ layout: "simple" });
    for (const text of ["Text File", "2.0 KB", "5 lines", "OK", "Release notes"]) expect(out).toContain(text);
    expect(out).not.toContain("overflow-y-auto");
    expect(html({ layout: "simple", showMeta: false })).not.toContain("5 lines");
  });

  it("renders nothing without plugin data", () => {
    expect(textfileModule.render({}, {})).toBeNull();
  });

  it("keeps the Theme card surface default", () => {
    expect(effectiveSettings(textfileModule).surface).toBe("theme");
  });
});
