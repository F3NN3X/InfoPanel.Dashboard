import { describe, expect, it } from "vitest";
import { GENERAL_DEFAULTS } from "@/lib/general";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { islandClock, islandSkin, shapeSpring, springTransition } from "./island-look";
import { idleViews, islandBox, islandReserve, islandTop } from "./island-model";

describe("islandSkin", () => {
  it("keeps today's black pill by default and the theme card's border with the theme tint", () => {
    expect(islandSkin(ISLAND_DEFAULTS)).toMatchObject({ background: "#000000", color: "#ffffff", border: undefined, fontWeight: 600, fontFamily: undefined });
    expect(islandSkin({ ...ISLAND_DEFAULTS, tint: "theme" }).border).toBe("1px solid hsl(var(--border))");
  });

  it("sees through below full opacity, with a blur", () => {
    const s = islandSkin({ ...ISLAND_DEFAULTS, opacity: 60 });
    expect(s.background).toBe("color-mix(in srgb, #000000 60%, transparent)");
    expect(s.backdropFilter).toContain("blur(");
  });

  it("draws the chosen border, shadow, font and weight", () => {
    const s = islandSkin({ ...ISLAND_DEFAULTS, tint: "custom", fgColor: "#ff0000", border: "subtle", shadow: false, font: "mono", weight: "bold" });
    expect(s.border).toBe("1px solid color-mix(in srgb, #ff0000 16%, transparent)");
    expect(s.boxShadow).toBe("none");
    expect(s.fontFamily).toContain("monospace");
    expect(s.fontWeight).toBe(700);
    expect(islandSkin({ ...ISLAND_DEFAULTS, border: "accent" }).border).toBe("1px solid hsl(var(--primary))");
  });
});

describe("islandClock", () => {
  it("follows General unless the island forces seconds or the hour format", () => {
    const g = { ...GENERAL_DEFAULTS, showSeconds: true, hour12: undefined };
    expect(islandClock(g, ISLAND_DEFAULTS)).toMatchObject({ showSeconds: true, hour12: undefined });
    expect(islandClock(g, { seconds: "hide", hours: "12" })).toMatchObject({ showSeconds: false, hour12: true });
    expect(islandClock({ ...g, showSeconds: false }, { seconds: "show", hours: "24" })).toMatchObject({ showSeconds: true, hour12: false });
  });
});

describe("shapeSpring", () => {
  it("has no animation with motion off or reduced motion", () => {
    expect(shapeSpring("idle", "expanded", "off", false)).toBeNull();
    expect(shapeSpring("idle", "expanded", "lively", true)).toBeNull();
  });

  it("takes the open spring into expanded and a flatter one with smooth", () => {
    const lively = shapeSpring("idle", "expanded", "lively", false);
    const smooth = shapeSpring("idle", "expanded", "smooth", false);
    expect(lively?.easing).not.toBe(smooth?.easing);
    // Smooth never overshoots: no point of its curve passes 1.
    const points = smooth?.easing.slice(7, -1).split(",").map(Number) ?? [];
    expect(Math.max(...points)).toBeLessThanOrEqual(1);
    expect(springTransition(lively, ["width"])).toMatch(/^width \d+ms linear\(/);
    expect(springTransition(null, ["width"])).toBeUndefined();
  });
});

describe("island boxes", () => {
  const look = { ...ISLAND_DEFAULTS };

  it("widens the idle pill for each extra value, the first taking the date's room", () => {
    const one = islandBox("idle", "m", { ...look, idle: "sensor", stats: [{ key: "a", label: "" }] });
    const three = islandBox("idle", "m", { ...look, idle: "sensor", stats: [{ key: "a", label: "" }, { key: "b", label: "" }, { key: "c", label: "" }] });
    expect(one.width).toBe(islandBox("idle", "m", { ...look, idle: "time-date" }).width);
    expect(three.width).toBeGreaterThan(one.width);
    // Rotating shows one view at a time in one slot.
    expect(islandBox("idle", "m", { ...look, idle: "sensor", rotate: 5, stats: [{ key: "a", label: "" }, { key: "b", label: "" }] }).width).toBe(one.width);
  });

  it("scales every box and draws the idle line as a hairline", () => {
    const base = islandBox("expanded", "m", look);
    const big = islandBox("expanded", "m", { ...look, scale: 150 });
    expect(big.width).toBe(Math.round(base.width * 1.5));
    expect(islandBox("line", "m", look)).toEqual({ width: 150, height: 5 });
  });

  it("puts the notch on the top edge and reserves from there", () => {
    expect(islandTop({ shape: "notch", offsetY: 20 })).toBe(0);
    expect(islandTop({ shape: "pill", offsetY: 20 })).toBe(20);
    const page = { width: 1920, height: 1080 };
    expect(islandReserve({ ...ISLAND_DEFAULTS, reserve: true, shape: "notch", offsetY: 20 }, page)).toBe(0 + 36 + 8);
  });
});

describe("idleViews", () => {
  it("lists the date, each value and the next event, in that order", () => {
    expect(idleViews({ idle: "time-date", stats: [] }, true).map((v) => v.kind)).toEqual(["date", "event"]);
    expect(idleViews({ idle: "sensor", stats: [{ key: "a", label: "" }, { key: "b", label: "" }] }, false)).toEqual([
      { kind: "stat", index: 0 },
      { kind: "stat", index: 1 },
    ]);
    expect(idleViews({ idle: "time", stats: [] }, false)).toEqual([]);
  });
});
