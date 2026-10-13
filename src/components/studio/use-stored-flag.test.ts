import { describe, expect, it } from "vitest";
import { parseFlag } from "./use-stored-flag";

describe("parseFlag", () => {
  it("reads a stored flag", () => {
    expect(parseFlag("1", false)).toBe(true);
    expect(parseFlag("0", true)).toBe(false);
  });

  it("falls back to the default for nothing or something unknown", () => {
    expect(parseFlag(null, true)).toBe(true);
    expect(parseFlag(null, false)).toBe(false);
    expect(parseFlag("yes", true)).toBe(true);
  });
});
