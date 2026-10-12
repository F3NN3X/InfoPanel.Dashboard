import { describe, expect, it } from "vitest";
import {
  GENERAL_DEFAULTS,
  fontStack,
  formatClock,
  isSupportedLocale,
  normalizeGeneral,
  resolveGeneral,
  withGeneral,
} from "./general";

describe("resolveGeneral", () => {
  it("fills the defaults", () => {
    expect(resolveGeneral({})).toEqual(GENERAL_DEFAULTS);
    expect(GENERAL_DEFAULTS.hour12).toBeUndefined();
    expect(GENERAL_DEFAULTS.showSeconds).toBe(true);
  });

  it("keeps the set keys over the defaults", () => {
    const g = resolveGeneral({ general: { font: "serif", hour12: true, motion: "reduce" } });
    expect(g).toMatchObject({ font: "serif", hour12: true, motion: "reduce", showSeconds: true, locale: "" });
  });
});

describe("normalizeGeneral", () => {
  it("drops non-objects and empty results", () => {
    expect(normalizeGeneral(undefined)).toBeUndefined();
    expect(normalizeGeneral("serif")).toBeUndefined();
    expect(normalizeGeneral([])).toBeUndefined();
    expect(normalizeGeneral({})).toBeUndefined();
  });

  it("keeps valid keys and drops invalid ones", () => {
    expect(
      normalizeGeneral({
        font: "comic",
        hour12: "yes",
        showSeconds: false,
        locale: " de-DE ",
        motion: "fast",
        hideCursor: true,
        extra: 1,
      })
    ).toEqual({ showSeconds: false, locale: "de-DE", hideCursor: true });
    expect(normalizeGeneral({ font: "mono", motion: "full", hour12: false })).toEqual({
      font: "mono",
      motion: "full",
      hour12: false,
    });
  });

  it("validates the locale", () => {
    expect(normalizeGeneral({ locale: "not a locale!" })).toBeUndefined();
    expect(normalizeGeneral({ locale: "" })).toEqual({ locale: "" });
    expect(isSupportedLocale("en-US")).toBe(true);
    expect(isSupportedLocale("")).toBe(true);
    expect(isSupportedLocale("##")).toBe(false);
  });
});

describe("withGeneral", () => {
  it("sets a key and clears it back to the default", () => {
    const g = withGeneral(undefined, "font", "serif");
    expect(g).toEqual({ font: "serif" });
    expect(withGeneral(g, "hour12", true)).toEqual({ font: "serif", hour12: true });
    expect(withGeneral(g, "font", undefined)).toBeUndefined();
  });
});

describe("fontStack", () => {
  it("leaves the system font to the page", () => {
    expect(fontStack("system")).toBeUndefined();
    expect(fontStack("mono")).toContain("monospace");
  });
});

describe("formatClock", () => {
  const at = new Date(2026, 9, 12, 15, 4, 5);

  it("formats 24 h with seconds and 12 h without", () => {
    expect(formatClock(at, { hour12: false, showSeconds: true, locale: "en-GB" }).time).toBe("15:04:05");
    const twelve = formatClock(at, { hour12: true, showSeconds: false, locale: "en-US" }).time;
    expect(twelve).toMatch(/^03:04\sPM$/);
  });

  it("formats the date in the chosen locale", () => {
    expect(formatClock(at, { hour12: undefined, showSeconds: true, locale: "de-DE" }).date).toBe("Mo., 12.10.2026");
    expect(formatClock(at, { hour12: undefined, showSeconds: true, locale: "en-US" }).date).toBe("Mon, 10/12/2026");
  });
});
