import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { presetsOf } from "./registry/b";
import Timer, { presetsThatFit } from "./Timer";

describe("Timer", () => {
  it("reads the presets setting: whole minutes 1-1440, at most eight", () => {
    expect(presetsOf("5, 15, 25")).toEqual([5, 15, 25]);
    expect(presetsOf("0, 2.6, x, 2000, 10")).toEqual([3, 10]);
    expect(presetsOf("1,2,3,4,5,6,7,8,9")).toHaveLength(8);
    expect(presetsOf("")).toBeUndefined();
  });

  it("shows only whole rows of buttons", () => {
    expect(presetsThatFit(6, 110, 30)).toBe(2);
    expect(presetsThatFit(6, 110, 70)).toBe(4);
    expect(presetsThatFit(3, 400, 300)).toBe(3);
    expect(presetsThatFit(3, 10, 10)).toBe(1);
    expect(presetsThatFit(3, 0, 0)).toBe(3);
  });

  it("renders the preset buttons when idle", () => {
    const html = renderToString(<Timer data={{}} presets={[5, 10]} pomodoro />);
    expect(html).toContain("5m");
    expect(html).toContain("10m");
  });
});
