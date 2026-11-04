import { describe, expect, it } from "vitest";
import { DEFAULT_ACCENT, DEFAULT_ACCENT_RGB } from "../../src/looks/palette.ts";

describe("the default accent", () => {
  it("is the same colour as hex and as r, g, b", () => {
    const channels = [1, 3, 5].map((i) => Number.parseInt(DEFAULT_ACCENT.slice(i, i + 2), 16));
    expect(DEFAULT_ACCENT_RGB).toEqual(channels);
  });
});
