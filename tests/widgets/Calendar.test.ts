import { describe, expect, it } from "vitest";
import { drawsOwnTile } from "@/widgets/Calendar";

describe("drawsOwnTile", () => {
  it("is the 2x2 only", () => {
    expect(drawsOwnTile(228, 228)).toBe(true);
    expect(drawsOwnTile(110, 110)).toBe(false);
    expect(drawsOwnTile(228, 110)).toBe(false);
  });

  it("leaves a large box to the summary view (Summary card: Always)", () => {
    expect(drawsOwnTile(400, 400)).toBe(false);
    expect(drawsOwnTile(240, 228)).toBe(false);
  });
});
