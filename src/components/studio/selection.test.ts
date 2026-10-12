import { describe, expect, it } from "vitest";
import { isToggleClick, nextSelection } from "./selection";

describe("nextSelection", () => {
  it("selects just the zone", () => {
    expect(nextSelection(["a", "b"], "c", "only")).toEqual(["c"]);
    expect(nextSelection(["a", "b"], "a", "only")).toEqual(["a"]);
  });

  it("toggles a zone in and out, a new one becoming the primary", () => {
    expect(nextSelection(["a"], "b", "toggle")).toEqual(["a", "b"]);
    expect(nextSelection(["a", "b"], "b", "toggle")).toEqual(["a"]);
    expect(nextSelection(["a", "b"], "a", "toggle")).toEqual(["b"]);
    expect(nextSelection([], "a", "toggle")).toEqual(["a"]);
  });

  it("makes a selected zone primary and keeps the rest, or selects an unselected one alone", () => {
    expect(nextSelection(["a", "b", "c"], "a", "primary")).toEqual(["b", "c", "a"]);
    expect(nextSelection(["a", "b"], "c", "primary")).toEqual(["c"]);
  });
});

describe("isToggleClick", () => {
  it("is Shift, Ctrl or ⌘", () => {
    const none = { shiftKey: false, ctrlKey: false, metaKey: false };
    expect(isToggleClick(none)).toBe(false);
    expect(isToggleClick({ ...none, shiftKey: true })).toBe(true);
    expect(isToggleClick({ ...none, ctrlKey: true })).toBe(true);
    expect(isToggleClick({ ...none, metaKey: true })).toBe(true);
  });
});
