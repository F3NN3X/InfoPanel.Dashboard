import { describe, expect, it } from "vitest";
import { DRAWER_MAX_WIDTH, DRAWER_MIN_WIDTH, parseDrawer, parseDrawerWidth } from "./left-rail";

describe("parseDrawer", () => {
  it("reads a stored drawer", () => {
    expect(parseDrawer("layers")).toBe("layers");
    expect(parseDrawer("profiles")).toBe("profiles");
    expect(parseDrawer("add")).toBe("add");
    expect(parseDrawer("alerts")).toBe("alerts");
    expect(parseDrawer("island")).toBe("island");
  });

  it("reads 'none' as collapsed", () => {
    expect(parseDrawer("none")).toBeNull();
  });

  it("opens Add when nothing (or something unknown) is stored", () => {
    expect(parseDrawer(null)).toBe("add");
    expect(parseDrawer("sources")).toBe("add");
  });
});

describe("parseDrawerWidth", () => {
  it("reads a stored width inside the range", () => {
    expect(parseDrawerWidth("320")).toBe(320);
    expect(parseDrawerWidth("300.6")).toBe(301);
  });

  it("clamps to the range", () => {
    expect(parseDrawerWidth("100")).toBe(DRAWER_MIN_WIDTH);
    expect(parseDrawerWidth("9999")).toBe(DRAWER_MAX_WIDTH);
  });

  it("falls back to the narrowest for nothing or junk", () => {
    expect(parseDrawerWidth(null)).toBe(DRAWER_MIN_WIDTH);
    expect(parseDrawerWidth("wide")).toBe(DRAWER_MIN_WIDTH);
  });
});
