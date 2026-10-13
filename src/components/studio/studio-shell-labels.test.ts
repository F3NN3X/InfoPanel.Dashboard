import { describe, expect, it } from "vitest";
import type { MonitorProfile } from "@/lib/layout";
import { mainPage } from "@/lib/pages";
import { profileMeta } from "./profiles-panel";
import { profileSummary } from "./studio-top-bar";

const profile = (patch: Partial<MonitorProfile>): MonitorProfile => ({
  id: "p",
  name: "Strip",
  width: 1920,
  height: 550,
  cols: 12,
  rows: 6,
  fit: "fill",
  pages: [mainPage()],
  ...patch,
});

describe("profileMeta", () => {
  it("reads size, grid and fit", () => {
    expect(profileMeta(profile({}))).toBe("1920×550 · 12×6 · Fill");
    expect(profileMeta(profile({ fit: "scroll" }))).toBe("1920×550 · 12×6 · Scroll");
  });
});

describe("profileSummary", () => {
  it("adds the zone count to the top bar's meta line", () => {
    const zone = { id: "z", module: "blank", colStart: 1, rowStart: 1, colSpan: 1, rowSpan: 1, visible: true };
    expect(profileSummary(profile({}))).toBe("1920 × 550 · 12 × 6 · Fill · 0 zones");
    expect(profileSummary(profile({ pages: [mainPage([zone])] }))).toContain("· 1 zone");
  });
});
