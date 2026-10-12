import { describe, expect, it } from "vitest";
import { TIPS, TIPS_KEY, dismissTips, tipsDismissed } from "./quick-tips";

function memory(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
}

describe("tipsDismissed / dismissTips", () => {
  it("shows the card until it is dismissed, and remembers the dismissal", () => {
    const storage = memory();
    expect(tipsDismissed(storage)).toBe(false);
    dismissTips(storage);
    expect(storage.getItem(TIPS_KEY)).toBe("1");
    expect(tipsDismissed(storage)).toBe(true);
  });

  it("survives storage that throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(tipsDismissed(broken)).toBe(false);
    expect(() => dismissTips(broken)).not.toThrow();
  });
});

describe("TIPS", () => {
  it("has the three lines of the design, shortcuts last", () => {
    expect(TIPS).toHaveLength(3);
    expect(TIPS[2]).toContain("? for shortcuts");
  });
});
