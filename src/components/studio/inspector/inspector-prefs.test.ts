import { describe, expect, it } from "vitest";
import { parseAdvanced, parseTabs, pickTab } from "./inspector-prefs";

describe("parseAdvanced", () => {
  it("is off unless stored as on", () => {
    expect(parseAdvanced("true")).toBe(true);
    expect(parseAdvanced("false")).toBe(false);
    expect(parseAdvanced(null)).toBe(false);
    expect(parseAdvanced("yes")).toBe(false);
  });
});

describe("parseTabs", () => {
  it("reads a map of tab ids per context", () => {
    expect(parseTabs('{"widget":"style","dashboard":"appearance"}')).toEqual({
      widget: "style",
      dashboard: "appearance",
    });
  });

  it("drops non-string entries and reads malformed storage as empty", () => {
    expect(parseTabs('{"widget":1,"panel":"data"}')).toEqual({ panel: "data" });
    expect(parseTabs(null)).toEqual({});
    expect(parseTabs("nope")).toEqual({});
    expect(parseTabs('["style"]')).toEqual({});
  });
});

describe("pickTab", () => {
  it("keeps the remembered tab while the context has it, else the first", () => {
    expect(pickTab("style", ["content", "style", "data"])).toBe("style");
    expect(pickTab("appearance", ["content", "style", "data"])).toBe("content");
    expect(pickTab(undefined, ["profile", "general"])).toBe("profile");
    expect(pickTab("style", [])).toBeUndefined();
  });
});
