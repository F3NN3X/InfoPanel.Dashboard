import { describe, expect, it } from "vitest";
import { parseDrawer } from "./left-rail";

describe("parseDrawer", () => {
  it("reads a stored drawer", () => {
    expect(parseDrawer("layers")).toBe("layers");
    expect(parseDrawer("profiles")).toBe("profiles");
    expect(parseDrawer("add")).toBe("add");
  });

  it("reads 'none' as collapsed", () => {
    expect(parseDrawer("none")).toBeNull();
  });

  it("opens Add when nothing (or something unknown) is stored", () => {
    expect(parseDrawer(null)).toBe("add");
    expect(parseDrawer("sources")).toBe("add");
  });
});
