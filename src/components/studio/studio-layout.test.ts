import { describe, expect, it } from "vitest";
import {
  BAR_H,
  CANVAS_PAD,
  MIN_DOCK,
  RULER_H,
  clampDock,
  computeLayout,
  fitZoomFor,
  type LayoutInput,
} from "./studio-layout";

const RAIL = 49;
const SIDE = 289;

/** A studio body under the 2000x1180 window's top bar. */
const BODY = { width: 2000, height: 1130 };

function layout(patch: Partial<LayoutInput> & Pick<LayoutInput, "page">) {
  return computeLayout({
    body: BODY,
    rail: RAIL,
    inspector: SIDE,
    mode: "auto",
    ...patch,
  });
}

describe("fitZoomFor", () => {
  it("fits width and height, whichever is tighter", () => {
    const box = { width: 1032, height: 516 };
    // 1032 / (1000 + 32) = 1, 516 / (1000 + 32) = 0.5
    expect(fitZoomFor(box, { width: 1000, height: 1000 })).toBe(0.5);
    expect(fitZoomFor({ width: 516, height: 9999 }, { width: 1000, height: 100 })).toBe(0.5);
  });

  it("fits the width only without a page height", () => {
    expect(fitZoomFor({ width: 1032, height: 10 }, { width: 1000, height: 0 })).toBe(1);
  });

  it("floors to 1% so the page never overshoots", () => {
    const z = fitZoomFor({ width: 1000, height: 9999 }, { width: 1920, height: 100 });
    expect(z).toBe(0.51);
    expect((1920 + CANVAS_PAD) * z).toBeLessThanOrEqual(1000);
  });

  it("clamps to the zoom range", () => {
    expect(fitZoomFor({ width: 99999, height: 99999 }, { width: 100, height: 100 })).toBe(2);
    expect(fitZoomFor({ width: 100, height: 100 }, { width: 5000, height: 5000 })).toBe(0.25);
  });

  it("is 100% for an unknown page and 25% for a box with no room", () => {
    expect(fitZoomFor({ width: 500, height: 500 }, { width: 0, height: 0 })).toBe(1);
    expect(fitZoomFor({ width: 0, height: 0 }, { width: 800, height: 480 })).toBe(0.25);
  });
});

describe("clampDock", () => {
  it("keeps the dock within [min, 70% of the body]", () => {
    expect(clampDock(50, 1000)).toBe(MIN_DOCK);
    expect(clampDock(400, 1000)).toBe(400);
    expect(clampDock(900, 1000)).toBe(700);
  });

  it("never drops below the minimum in a tiny body", () => {
    expect(clampDock(100, 200)).toBe(MIN_DOCK);
  });
});

describe("computeLayout (auto)", () => {
  it("puts the inspector below a 1920x550 strip", () => {
    const l = layout({ page: { width: 1920, height: 550 } });
    expect(l.placement).toBe("bottom");
    // Page fitted to the full width (rail only), dock takes the rest.
    expect(l.canvasWidth).toBe(2000 - RAIL - 28);
    expect(l.fitZoom).toBeGreaterThan(0.95);
    expect(l.dockHeight).toBeGreaterThan(450);
    expect(l.dockHeight).toBeLessThanOrEqual(1130 * 0.7);
    expect(l.canvasHeight + RULER_H + l.dockHeight).toBe(BODY.height);
  });

  it("keeps a portrait 1080x1920 profile beside the inspector", () => {
    const l = layout({ page: { width: 1080, height: 1920 } });
    expect(l.placement).toBe("side");
    expect(l.dockHeight).toBe(0);
    expect(l.canvasWidth).toBe(2000 - RAIL - SIDE - 28);
    expect(l.canvasHeight).toBe(BODY.height - RULER_H - BAR_H);
  });

  it("keeps an 800x480 page on a 1366x768 laptop beside the inspector", () => {
    const l = computeLayout({
      body: { width: 1366, height: 720 },
      page: { width: 800, height: 480 },
      rail: RAIL,
      inspector: SIDE,
      mode: "auto",
    });
    expect(l.placement).toBe("side");
    expect(l.fitZoom).toBeGreaterThan(1);
  });

  it("stays beside the canvas when the dock would be too small", () => {
    // Free space is well over 35% of a tall body but the page fills most of it.
    const l = layout({ page: { width: 1920, height: 800 } });
    expect(l.placement).toBe("side");
  });

  it("stays beside the canvas without a page height", () => {
    expect(layout({ page: { width: 1920, height: 0 } }).placement).toBe("side");
  });

  it("uses a scroll profile's natural height", () => {
    const l = layout({ page: { width: 1920, height: 0, naturalHeight: 400 } });
    expect(l.placement).toBe("bottom");
    // Scroll pages fit the width only.
    expect(l.fitZoom).toBeGreaterThan(0.95);
  });
});

describe("computeLayout (explicit modes)", () => {
  it("side mode ignores a short page", () => {
    const l = layout({ page: { width: 1920, height: 550 }, mode: "side" });
    expect(l.placement).toBe("side");
    expect(l.canvasWidth).toBe(2000 - RAIL - SIDE - 28);
  });

  it("bottom mode forces the dock for a portrait page", () => {
    const l = layout({ page: { width: 1080, height: 1920 }, mode: "bottom" });
    expect(l.placement).toBe("bottom");
    expect(l.dockHeight).toBe(MIN_DOCK);
    // The page now fits by height in what is left above the dock.
    expect(l.fitZoom).toBe(
      Math.floor(((BODY.height - MIN_DOCK - RULER_H) / (1920 + CANVAS_PAD)) * 100) / 100
    );
  });

  it("bottom mode without a page height takes a share of the body", () => {
    const l = layout({ page: { width: 1920, height: 0 }, mode: "bottom" });
    expect(l.placement).toBe("bottom");
    expect(l.dockHeight).toBe(Math.round(1130 * 0.35));
  });

  it("a user dock height overrides the default, clamped", () => {
    const page = { width: 1920, height: 550 };
    expect(layout({ page, dockHeight: 300 }).dockHeight).toBe(300);
    expect(layout({ page, dockHeight: 40 }).dockHeight).toBe(MIN_DOCK);
    expect(layout({ page, dockHeight: 5000 }).dockHeight).toBe(Math.round(1130 * 0.7));
  });

  it("a smaller canvas above a dragged dock lowers the fit zoom", () => {
    const page = { width: 1920, height: 550 };
    const auto = layout({ page });
    const big = layout({ page, dockHeight: 800 });
    expect(big.fitZoom).toBeLessThan(auto.fitZoom);
  });

  it("a user dock height does not move auto into the dock by itself", () => {
    expect(layout({ page: { width: 1080, height: 1920 }, dockHeight: 300 }).placement).toBe(
      "side"
    );
  });
});

describe("computeLayout (odd sizes)", () => {
  it("falls back to side with an unmeasured body", () => {
    const l = computeLayout({
      body: { width: 0, height: 0 },
      page: { width: 1920, height: 550 },
      rail: RAIL,
      inspector: SIDE,
      mode: "bottom",
    });
    expect(l.placement).toBe("side");
    expect(l.canvasWidth).toBe(0);
    expect(l.canvasHeight).toBe(0);
    expect(l.fitZoom).toBe(0.25);
  });

  it("never reports negative canvas boxes in a narrow body", () => {
    const l = computeLayout({
      body: { width: 300, height: 400 },
      page: { width: 800, height: 480 },
      rail: RAIL,
      inspector: SIDE,
      mode: "side",
    });
    expect(l.canvasWidth).toBe(0);
    expect(l.canvasHeight).toBe(400 - RULER_H - BAR_H);
  });

  it("handles a page with no size", () => {
    const l = layout({ page: { width: 0, height: 0 } });
    expect(l.placement).toBe("side");
    expect(l.fitZoom).toBe(1);
  });
});

describe("computeLayout (open drawer)", () => {
  const DRAWER = 256;
  const strip = { width: 1920, height: 550 };

  it("beside the canvas the drawer narrows the canvas", () => {
    const l = layout({ page: { width: 1080, height: 1920 }, drawer: DRAWER });
    expect(l.placement).toBe("side");
    expect(l.canvasWidth).toBe(2000 - RAIL - DRAWER - SIDE - 28);
  });

  it("in the dock the drawer moves into the dock: the canvas keeps the full width", () => {
    const withDrawer = layout({ page: strip, drawer: DRAWER });
    const without = layout({ page: strip });
    expect(withDrawer.placement).toBe("bottom");
    expect(withDrawer.canvasWidth).toBe(2000 - RAIL - 28);
    expect(withDrawer).toEqual(without);
    // The page fits near 100% at 2000 wide.
    expect(withDrawer.fitZoom).toBeGreaterThan(0.95);
  });
});

describe("computeLayout (collapsed dock)", () => {
  const strip = { width: 1920, height: 550 };

  it("shrinks the dock to its bar and gives the canvas the height", () => {
    const open = layout({ page: strip });
    const closed = layout({ page: strip, collapsed: true });
    expect(closed.placement).toBe("bottom");
    expect(closed.dockHeight).toBe(BAR_H);
    expect(closed.canvasHeight).toBe(BODY.height - BAR_H - RULER_H);
    expect(closed.canvasHeight).toBeGreaterThan(open.canvasHeight);
  });

  it("ignores a dragged dock height while collapsed", () => {
    expect(layout({ page: strip, collapsed: true, dockHeight: 500 }).dockHeight).toBe(BAR_H);
  });

  it("does not change the side placement", () => {
    const page = { width: 1080, height: 1920 };
    expect(layout({ page, collapsed: true })).toEqual(layout({ page }));
  });
});
