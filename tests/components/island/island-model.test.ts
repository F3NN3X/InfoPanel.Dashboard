import { describe, expect, it } from "vitest";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { fitIslandSize, islandIdleWidth, islandReserve, NARROW_PAGE } from "@/components/island/island-model";
import { gapWidth, ISLAND_MARGIN } from "@/widgets/StatusBar/layout";

const page = (width: number, height = 1080) => ({ width, height });

describe("fitIslandSize", () => {
  it("keeps the chosen size on a wide page and steps down one size under 1100px", () => {
    expect(fitIslandSize("m", page(1920))).toBe("m");
    expect(fitIslandSize("l", page(1920))).toBe("l");
    expect(fitIslandSize("m", page(NARROW_PAGE))).toBe("m");
    expect(fitIslandSize("m", page(NARROW_PAGE - 1))).toBe("s");
    expect(fitIslandSize("l", page(1024, 600))).toBe("m");
  });

  it("never goes below the smallest size, and still shrinks for a short page", () => {
    expect(fitIslandSize("s", page(800, 480))).toBe("s");
    expect(fitIslandSize("l", page(1920, 150))).toBe("s");
    // an unmeasured page keeps the choice
    expect(fitIslandSize("l", page(0, 0))).toBe("l");
  });
});

describe("the island's room at rest follows the window", () => {
  const island = { ...ISLAND_DEFAULTS, enabled: true, size: "m" as const };

  it("is narrower on a narrow page, and the Status Bar's gap (idle width plus its margins) with it", () => {
    const wide = islandIdleWidth(island, page(1920));
    const narrow = islandIdleWidth(island, page(800, 480));
    expect(narrow).toBeLessThan(wide);
    expect(gapWidth("auto", 160, narrow)).toBe(narrow + 2 * ISLAND_MARGIN);
    expect(gapWidth("auto", 160, wide)).toBe(wide + 2 * ISLAND_MARGIN);
  });

  it("reserves the height of the size that fits", () => {
    const reserving = { ...island, reserve: true };
    expect(islandReserve(reserving, page(800, 480))).toBeLessThan(islandReserve(reserving, page(1920)));
  });
});
