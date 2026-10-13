import { describe, expect, it } from "vitest";
import { swipeDirection } from "./swipe";

describe("swipeDirection", () => {
  it("swipes left for the next page and right for the previous", () => {
    expect(swipeDirection({ dx: -120, dy: 10, ms: 200 })).toBe("next");
    expect(swipeDirection({ dx: 120, dy: -10, ms: 200 })).toBe("prev");
  });

  it("needs at least 60 px", () => {
    expect(swipeDirection({ dx: -59, dy: 0, ms: 100 })).toBeNull();
    expect(swipeDirection({ dx: -60, dy: 0, ms: 100 })).toBe("next");
  });

  it("needs to be quick (under 600 ms)", () => {
    expect(swipeDirection({ dx: -200, dy: 0, ms: 599 })).toBe("next");
    expect(swipeDirection({ dx: -200, dy: 0, ms: 600 })).toBeNull();
  });

  it("ignores mostly vertical moves, so scrolling is left alone", () => {
    expect(swipeDirection({ dx: -100, dy: 80, ms: 200 })).toBeNull();
    expect(swipeDirection({ dx: -100, dy: 50, ms: 200 })).toBe("next");
    expect(swipeDirection({ dx: 0, dy: 300, ms: 200 })).toBeNull();
  });
});
