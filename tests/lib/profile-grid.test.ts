import { describe, expect, it } from "vitest";
import {
  KIOSK_EDGE_INSET,
  barRowTemplate,
  DEFAULT_GRID_GAP,
  cellAt,
  normalizeSpacing,
  profileGap,
  profilePadding,
  trackPitch,
  trackSize,
  zoneBox,
} from "@/lib/profile-grid";

describe("profileGap / profilePadding", () => {
  it("keeps a small inset off a fill kiosk page's edges unless the screen touches them", () => {
    expect(KIOSK_EDGE_INSET).toBe(8);
    expect(profilePadding({ fit: "fill", edges: "inset" }, true)).toBe(8);
    expect(profilePadding({ fit: "fill", edges: "touch" }, true)).toBe(0);
    // a padding the screen sets wins over both, and the other pages do not read the option
    expect(profilePadding({ fit: "fill", edges: "touch", padding: 16 }, true)).toBe(16);
    expect(profilePadding({ fit: "fill", padding: 0 }, true)).toBe(0);
    expect(profilePadding({ fit: "fill", edges: "touch" }, false)).toBe(12);
    expect(profilePadding({ fit: "scroll", edges: "touch" }, true)).toBe(24);
  });

  it("defaults to today's spacing per mode", () => {
    expect(profileGap({ fit: "fill" })).toBe(DEFAULT_GRID_GAP);
    expect(DEFAULT_GRID_GAP).toBe(12);
    expect(profilePadding({ fit: "fill" }, true)).toBe(KIOSK_EDGE_INSET);
    expect(profilePadding({ fit: "fill" }, false)).toBe(12);
    expect(profilePadding({ fit: "scroll" }, true)).toBe(24);
    expect(profilePadding({ fit: "scroll" }, false)).toBe(24);
  });

});

describe("normalizeSpacing", () => {
  it("keeps whole px in range and drops the rest", () => {
    expect(normalizeSpacing(12.4)).toBe(12);
    expect(normalizeSpacing(-3)).toBe(0);
    expect(normalizeSpacing(9999)).toBe(200);
    expect(normalizeSpacing("12")).toBeUndefined();
    expect(normalizeSpacing(Number.NaN)).toBeUndefined();
    expect(normalizeSpacing(undefined)).toBeUndefined();
  });
});

describe("track math", () => {
  // 4 columns over 1000 px.
  it.each([
    [0, 250, 250],
    [12, 241, 253],
    [24, 232, 256],
  ])("gap %i: size %d, pitch %d", (gap, size, pitch) => {
    expect(trackSize(1000, 4, gap)).toBe(size);
    expect(trackPitch(1000, 4, gap)).toBe(pitch);
  });

});

describe("cellAt", () => {
  const grid = { width: 1000, height: 400 };

  it("maps points to cells with no gap", () => {
    expect(cellAt(0, 0, grid, 4, 2, 0)).toEqual({ col: 1, row: 1 });
    expect(cellAt(249, 199, grid, 4, 2, 0)).toEqual({ col: 1, row: 1 });
    expect(cellAt(250, 200, grid, 4, 2, 0)).toEqual({ col: 2, row: 2 });
    expect(cellAt(999, 399, grid, 4, 2, 0)).toEqual({ col: 4, row: 2 });
  });

  it("returns null outside the grid", () => {
    expect(cellAt(-1, 0, grid, 4, 2, 12)).toBeNull();
    expect(cellAt(0, 500, grid, 4, 2, 12)).toBeNull();
    expect(cellAt(0, 0, { width: 0, height: 0 }, 4, 2, 12)).toBeNull();
  });
});

describe("zoneBox", () => {
  const track = { width: 100, height: 50 };

  it.each([0, 12, 24])("lines a 2×2 zone at C2 R2 up with the tracks (gap %i)", (gap) => {
    expect(zoneBox({ col: 2, row: 2, cols: 2, rows: 2 }, track, gap)).toEqual({
      left: 100 + gap,
      top: 50 + gap,
      width: 200 + gap,
      height: 100 + gap,
    });
  });

});

describe("barRowTemplate", () => {
  const bar = { module: "StatusBar", colStart: 1, rowStart: 1, colSpan: 12, rowSpan: 1, visible: true };
  const panel = { module: "SystemOverview", colStart: 1, rowStart: 2, colSpan: 6, rowSpan: 5, visible: true };
  const profile = { fit: "fill" as const, cols: 12, rows: 6 };
  const tall = (zones: (typeof bar)[]) => barRowTemplate(profile, zones, 1064, 1080);

  it("caps a lone full-width bar's row at 8vh within 56..96px and shares the rest", () => {
    expect(tall([bar, panel])).toBe("clamp(56px, 8vh, 96px) repeat(5, minmax(0, 1fr))");
  });

  it("leaves rows even when the even row is no taller than the cap", () => {
    // 380px shared by six rows and five gaps: 53px each, under the 56px floor
    expect(barRowTemplate(profile, [bar, panel], 380, 400)).toBeUndefined();
  });

  it("only applies to the default layout: a bar alone in the first row, full width, on a fill page", () => {
    expect(tall([bar, { ...panel, rowStart: 1, rowSpan: 6, colSpan: 4, colStart: 9 }])).toBeUndefined();
    expect(tall([{ ...bar, colSpan: 6 }, panel])).toBeUndefined();
    expect(tall([{ ...bar, rowSpan: 2 }, panel])).toBeUndefined();
    expect(tall([panel])).toBeUndefined();
    expect(barRowTemplate({ ...profile, fit: "scroll" }, [bar, panel], 1064, 1080)).toBeUndefined();
    expect(barRowTemplate({ ...profile, rows: 2 }, [bar, panel], 1064, 1080)).toBeUndefined();
  });

  it("ignores a hidden zone", () => {
    expect(tall([bar, { ...panel, rowStart: 1, visible: false }])).toBeDefined();
  });
});
