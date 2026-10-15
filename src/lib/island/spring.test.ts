import { describe, expect, it } from "vitest";
import { motionScale, settleTime, springAt, springCss, springFor, SPRINGS } from "./spring";

describe("springs", () => {
  it("starts at 0 and comes to rest at 1", () => {
    for (const s of Object.values(SPRINGS)) {
      expect(springAt(s, 0)).toBeCloseTo(0, 6);
      expect(springAt(s, settleTime(s))).toBeCloseTo(1, 2);
    }
  });

  it("overshoots with bounce, not without", () => {
    const peak = (bounce: number) => Math.max(...Array.from({ length: 200 }, (_, i) => springAt({ duration: 0.4, bounce }, i / 200)));
    expect(peak(0.24)).toBeGreaterThan(1.01);
    expect(peak(0)).toBeLessThanOrEqual(1.0001);
  });

  it("closes faster and flatter than it opens", () => {
    expect(settleTime(SPRINGS.close)).toBeLessThan(settleTime(SPRINGS.open));
  });

  it("writes a CSS linear() easing from 0 to 1 and a duration stretched by slow", () => {
    const { easing, ms } = springCss(SPRINGS.open);
    expect(easing).toMatch(/^linear\(0, .*, 1\)$/);
    expect(easing.split(",")).toHaveLength(41);
    expect(springCss(SPRINGS.open, 3).ms).toBe(Math.round(ms * 3));
    expect(ms).toBeGreaterThan(200);
    expect(ms).toBeLessThan(1700);
  });

  it("opens into expanded, closes out of it, morphs between the rest", () => {
    expect(springFor("idle", "expanded")).toBe("open");
    expect(springFor(null, "expanded")).toBe("open");
    expect(springFor("expanded", "compact")).toBe("close");
    expect(springFor("idle", "activity")).toBe("morph");
    expect(springFor("expanded", "expanded")).toBe("morph");
  });

  it("reads ?slow=N for tuning, within 1..20", () => {
    expect(motionScale("?slow=4")).toBe(4);
    expect(motionScale("")).toBe(1);
    expect(motionScale("?slow=0.5")).toBe(1);
    expect(motionScale("?slow=abc")).toBe(1);
    expect(motionScale("?kiosk=1&slow=20")).toBe(20);
  });
});
