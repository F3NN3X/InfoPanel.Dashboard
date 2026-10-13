import { describe, expect, it } from "vitest";
import {
  AUTO_BOTTOM_ASPECT,
  BAR_H,
  CANVAS_PAD_X,
  CANVAS_PAD_Y,
  DEFAULT_DOCK,
  MIN_DOCK,
  autoPlacement,
  clampDock,
  computeLayout,
  fitZoomFor,
  leftPanelFits,
  placementFor,
  nextLayoutMode,
  stepZoom,
  ZOOM_STEPS,
  type LayoutInput,
} from "./studio-layout";

const RAIL = 52;
const SIDE = 340;

/** A studio body under the 2000x1180 window's top bar. */
const BODY = { width: 2000, height: 1130 };

/** A layout whose design size follows the page, unless the patch sets one. */
function layout(patch: Partial<LayoutInput> & Pick<LayoutInput, "page">) {
  return computeLayout({
    body: BODY,
    rail: RAIL,
    inspector: SIDE,
    mode: "auto",
    design: { width: patch.page.width, height: patch.page.height },
    ...patch,
  });
}

describe("fitZoomFor", () => {
  it("fits width and height, whichever is tighter", () => {
    const box = { width: 1000 + CANVAS_PAD_X, height: 500 + CANVAS_PAD_Y };
    // (1080 - 80) / 1000 = 1, (660 - 160) / 1000 = 0.5
    expect(fitZoomFor(box, { width: 1000, height: 1000 })).toBe(0.5);
    expect(fitZoomFor({ width: 500 + CANVAS_PAD_X, height: 9999 }, { width: 1000, height: 100 })).toBe(0.5);
  });

  it("fits the width only without a page height", () => {
    expect(fitZoomFor({ width: 1000 + CANVAS_PAD_X, height: 10 }, { width: 1000, height: 0 })).toBe(1);
  });

  it("floors to 1% so the page never overshoots", () => {
    const z = fitZoomFor({ width: 1000, height: 9999 }, { width: 1920, height: 100 });
    expect(z).toBe(0.47);
    expect(1920 * z + CANVAS_PAD_X).toBeLessThanOrEqual(1000);
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

describe("autoPlacement", () => {
  it("goes below the canvas only for a profile wider than 2.5 : 1", () => {
    expect(autoPlacement({ width: 1920, height: 550 })).toBe("bottom");
    expect(autoPlacement({ width: 1920, height: 768 })).toBe("side");
    expect(autoPlacement({ width: 1000 * AUTO_BOTTOM_ASPECT, height: 1000 })).toBe("side");
    expect(autoPlacement({ width: 1080, height: 1920 })).toBe("side");
  });

  it("stays beside the canvas without a usable design size", () => {
    expect(autoPlacement()).toBe("side");
    expect(autoPlacement({ width: 1920, height: 0 })).toBe("side");
  });
});

describe("nextLayoutMode", () => {
  it("cycles Auto, Side, Bottom", () => {
    expect(nextLayoutMode("auto")).toBe("side");
    expect(nextLayoutMode("side")).toBe("bottom");
    expect(nextLayoutMode("bottom")).toBe("auto");
  });
});

describe("computeLayout (auto)", () => {
  it("puts the inspector below a 1920x550 strip at the default dock height", () => {
    const l = layout({ page: { width: 1920, height: 550 } });
    expect(l.placement).toBe("bottom");
    expect(l.dockHeight).toBe(DEFAULT_DOCK);
    expect(l.canvasWidth).toBe(2000 - RAIL);
    expect(l.canvasHeight + l.dockHeight).toBe(BODY.height);
  });

  it("keeps a portrait 1080x1920 profile beside the inspector", () => {
    const l = layout({ page: { width: 1080, height: 1920 } });
    expect(l.placement).toBe("side");
    expect(l.dockHeight).toBe(0);
    expect(l.canvasWidth).toBe(2000 - RAIL - SIDE);
    expect(l.canvasHeight).toBe(BODY.height);
  });

  it("keeps an 800x480 page beside the inspector (ratio under 2.5)", () => {
    const l = computeLayout({
      body: { width: 1366, height: 720 },
      page: { width: 800, height: 480 },
      design: { width: 800, height: 480 },
      rail: RAIL,
      inspector: SIDE,
      mode: "auto",
    });
    expect(l.placement).toBe("side");
  });

  it("decides by the design size, not by the free space", () => {
    const wide = layout({ page: { width: 1920, height: 800 }, design: { width: 1920, height: 700 } });
    expect(wide.placement).toBe("bottom");
    const tall = layout({ page: { width: 1920, height: 550 }, design: { width: 1920, height: 800 } });
    expect(tall.placement).toBe("side");
  });

  it("goes below for a scroll profile of a wide design size", () => {
    const l = layout({
      page: { width: 1920, height: 0, naturalHeight: 400 },
      design: { width: 1920, height: 550 },
    });
    expect(l.placement).toBe("bottom");
    // Scroll pages fit the width only.
    expect(l.fitZoom).toBeGreaterThan(0.95);
  });

  it("stays beside the canvas without a design size", () => {
    expect(layout({ page: { width: 1920, height: 550 }, design: undefined }).placement).toBe("side");
  });
});

describe("computeLayout (explicit modes)", () => {
  it("side mode ignores a wide profile", () => {
    const l = layout({ page: { width: 1920, height: 550 }, mode: "side" });
    expect(l.placement).toBe("side");
    expect(l.canvasWidth).toBe(2000 - RAIL - SIDE);
  });

  it("bottom mode forces the dock for a portrait page", () => {
    const l = layout({ page: { width: 1080, height: 1920 }, mode: "bottom" });
    expect(l.placement).toBe("bottom");
    expect(l.dockHeight).toBe(DEFAULT_DOCK);
    // The page fits by height in what is left above the dock.
    expect(l.fitZoom).toBe(
      Math.floor(((BODY.height - DEFAULT_DOCK - CANVAS_PAD_Y) / 1920) * 100) / 100
    );
  });

  it("a user dock height overrides the default, clamped", () => {
    const page = { width: 1920, height: 550 };
    expect(layout({ page, dockHeight: 400 }).dockHeight).toBe(400);
    expect(layout({ page, dockHeight: 40 }).dockHeight).toBe(MIN_DOCK);
    expect(layout({ page, dockHeight: 5000 }).dockHeight).toBe(Math.round(1130 * 0.7));
  });

  it("a taller dock lowers the fit zoom", () => {
    const page = { width: 1920, height: 550 };
    expect(layout({ page, dockHeight: 800 }).fitZoom).toBeLessThan(layout({ page }).fitZoom);
  });

  it("a user dock height does not move auto into the dock by itself", () => {
    expect(layout({ page: { width: 1080, height: 1920 }, dockHeight: 300 }).placement).toBe("side");
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
    expect(l.canvasHeight).toBe(400);
  });

  it("handles a page with no size", () => {
    const l = layout({ page: { width: 0, height: 0 } });
    expect(l.placement).toBe("side");
    expect(l.fitZoom).toBe(1);
  });
});

describe("computeLayout (open left panel)", () => {
  const DRAWER = 256;
  const strip = { width: 1920, height: 550 };

  it("beside the canvas it narrows the canvas", () => {
    const l = layout({ page: { width: 1080, height: 1920 }, drawer: DRAWER });
    expect(l.placement).toBe("side");
    expect(l.canvasWidth).toBe(2000 - RAIL - DRAWER - SIDE);
  });

  it("with the dock below it still narrows the canvas (the panel is not a dock column)", () => {
    const withDrawer = layout({ page: strip, drawer: DRAWER });
    expect(withDrawer.placement).toBe("bottom");
    expect(withDrawer.canvasWidth).toBe(2000 - RAIL - DRAWER);
    expect(withDrawer.dockHeight).toBe(layout({ page: strip }).dockHeight);
  });
});

describe("computeLayout (collapsed dock)", () => {
  const strip = { width: 1920, height: 550 };

  it("shrinks the dock to its top row and gives the canvas the height", () => {
    const open = layout({ page: strip });
    const closed = layout({ page: strip, collapsed: true });
    expect(closed.placement).toBe("bottom");
    expect(closed.dockHeight).toBe(BAR_H);
    expect(closed.canvasHeight).toBe(BODY.height - BAR_H);
    expect(closed.canvasHeight).toBeGreaterThan(open.canvasHeight);
  });

  it("ignores a dragged dock height while collapsed", () => {
    expect(layout({ page: strip, collapsed: true, dockHeight: 500 }).dockHeight).toBe(BAR_H);
  });

  it("keeps the side placement but frees the inspector's column for the canvas", () => {
    const page = { width: 1080, height: 1920 };
    const open = layout({ page });
    const closed = layout({ page, collapsed: true });
    expect(closed.placement).toBe("side");
    expect(closed.dockHeight).toBe(0);
    expect(closed.canvasWidth).toBe(open.canvasWidth + SIDE);
    expect(closed.canvasHeight).toBe(open.canvasHeight);
  });
});

describe("stepZoom", () => {
  it("steps along the stops from a stop", () => {
    expect(stepZoom(1, 1)).toBe(1.25);
    expect(stepZoom(1, -1)).toBe(0.75);
    expect(stepZoom(0.25, -1)).toBe(0.25);
    expect(stepZoom(2, 1)).toBe(2);
  });

  it("goes the requested way from an off-stop zoom such as Fit", () => {
    expect(stepZoom(0.63, 1)).toBe(0.75);
    expect(stepZoom(0.63, -1)).toBe(0.5);
    expect(stepZoom(1.55, 1)).toBe(2);
    expect(stepZoom(1.55, -1)).toBe(1.5);
    expect(stepZoom(0.1, -1)).toBe(0.25);
    expect(stepZoom(3, 1)).toBe(2);
  });

  it("always moves in the asked direction inside the range", () => {
    for (let z = 0.3; z < 1.95; z += 0.037) {
      expect(stepZoom(z, 1)).toBeGreaterThan(z);
      expect(stepZoom(z, -1)).toBeLessThan(z);
      expect(ZOOM_STEPS).toContain(stepZoom(z, 1));
    }
  });
});

describe("left panel overlay", () => {
  const widths = { rail: RAIL, drawer: 256, inspector: SIDE };

  it("fits beside the canvas and a side inspector on a wide window", () => {
    expect(leftPanelFits(1440, "side", widths)).toBe(true);
  });

  it("overlays at 1024 with the inspector at the side (52 + 256 + 420 + 340 = 1068)", () => {
    expect(leftPanelFits(1024, "side", widths)).toBe(false);
    expect(leftPanelFits(1068, "side", widths)).toBe(true);
  });

  it("fits at 1024 when the inspector is in the bottom dock", () => {
    expect(leftPanelFits(1024, "bottom", widths)).toBe(true);
  });

  it("counts an unmeasured body or a closed panel as fitting", () => {
    expect(leftPanelFits(0, "side", widths)).toBe(true);
    expect(leftPanelFits(800, "side", { ...widths, drawer: 0 })).toBe(true);
  });

  it("a collapsed side inspector takes no width, so the panel fits sooner", () => {
    expect(leftPanelFits(1024, "side", { ...widths, inspector: 0 })).toBe(true);
  });

  it("resolves the placement for each mode", () => {
    const strip = { width: 1920, height: 550 };
    expect(placementFor("auto", strip)).toBe("bottom");
    expect(placementFor("auto", { width: 1920, height: 1080 })).toBe("side");
    expect(placementFor("bottom", strip, true)).toBe("side");
    expect(placementFor("side", strip)).toBe("side");
  });
});
