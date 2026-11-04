import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SkinCtx } from "@/widgets/core/theme";
import { skinContext } from "@/widgets/core/look";
import { Bar, Icon, LedLadder, RangeBar, Ring, Spark, ThresholdLine, UNIT_CLASS, Unit, isWordUnit, ringDashOffset, ringStroke, sparkMarks, sparkRange, sparkY } from "@/widgets/core/primitives";

describe("Ring sweep", () => {
  const dash = (html: string) => [...html.matchAll(/stroke-dasharray="([^"]+)"/g)].map((m) => m[1]);

  it("draws a full ring by default (a whole circle, offset by the value)", () => {
    const html = renderToString(<Ring value={50} />);
    expect(html).toContain("stroke-dashoffset");
    expect(dash(html)).toHaveLength(1);
  });
  it("draws an open arc: the track and the value are partial dashes", () => {
    const html = renderToString(<Ring value={50} sweep={270} track="red" />);
    const [track, value] = dash(html).map((d) => Number(d.split(" ")[0]));
    expect(html).not.toContain("stroke-dashoffset");
    expect(html).toContain('stroke="red"');
    expect(value).toBeCloseTo(track / 2);
    expect(dash(renderToString(<Ring value={50} />))[0]).not.toBe(dash(html)[0]);
  });
});

describe("Bar segments", () => {
  const cells = (html: string) => html.match(/<span /g)?.length ?? 0;

  it("draws 24 cells by default and as many as asked", () => {
    expect(cells(renderToString(<Bar value={50} style="segments" />))).toBe(24);
    expect(cells(renderToString(<Bar value={50} style="segments" segments={12} />))).toBe(12);
  });
});

describe("sparkMarks", () => {
  it("marks the last, lowest and highest sample on the line's own y", () => {
    const m = sparkMarks([5, 1, 9, 4], 1, 9);
    expect(m.last).toMatchObject({ i: 3, v: 4, x: 100, y: sparkY(4, 1, 9) });
    expect(m.min).toMatchObject({ i: 1, v: 1, y: sparkY(1, 1, 9) });
    expect(m.max).toMatchObject({ i: 2, v: 9 });
  });

  it("skips the extremes of a flat series and keeps the last dot", () => {
    const m = sparkMarks([3, 3, 3], 0, 10);
    expect(m.last?.i).toBe(2);
    expect(m.min).toBeNull();
    expect(m.max).toBeNull();
  });

  it("skips an extreme that is the last sample, and a tie takes the latest index", () => {
    expect(sparkMarks([1, 5, 9], 1, 9).max).toBeNull();
    expect(sparkMarks([9, 2, 9, 4], 2, 9).max?.i).toBe(2);
  });

  it("ignores non-finite samples and returns nothing for none", () => {
    expect(sparkMarks([2, Number.NaN, 8, Number.NaN], 2, 8).last?.i).toBe(2);
    expect(sparkMarks([Number.NaN], 0, 1)).toEqual({ last: null, min: null, max: null });
  });
});

describe("Spark marks", () => {
  it("draws nothing extra by default and a dot when asked", () => {
    const v = [1, 4, 2, 6];
    expect(renderToString(<Spark values={v} />)).not.toContain("rounded-full");
    expect(renderToString(<Spark values={v} marks />)).toContain("rounded-full");
  });
  it("keeps a caller's own positioning on the wrapper instead of adding relative", () => {
    const html = renderToString(<Spark values={[1, 4, 2, 6]} marks className="absolute inset-0 h-full" />);
    expect(html).not.toContain("relative absolute");
    expect(html).toContain('class="absolute inset-0 h-full"');
  });
});

describe("ringStroke", () => {
  it("is 7.5% of the diameter, and never under 6px on screen", () => {
    expect(ringStroke(200)).toBe(7.5);
    expect(ringStroke(60)).toBeCloseTo(10);
    expect(ringStroke(0)).toBe(7.5);
  });
});

describe("ringDashOffset", () => {
  const c = 100;
  it("stops a round cap short by its radius so the arc ends on the value", () => {
    expect(ringDashOffset(c, 0.5, 8, false)).toBe(50);
    expect(ringDashOffset(c, 0.5, 8, true)).toBe(54);
  });
  it("keeps an empty and a full ring as they are", () => {
    expect(ringDashOffset(c, 0, 8, true)).toBe(100);
    expect(ringDashOffset(c, 1, 8, true)).toBe(0);
  });
  it("never shortens a short arc past half its length", () => {
    expect(ringDashOffset(c, 0.02, 8, true)).toBeCloseTo(98 + 1);
  });
});

describe("sparkRange", () => {
  it("keeps the data's range with headroom on top", () => {
    expect(sparkRange([2, 4], undefined, undefined)).toEqual([2, 4 * 1.08]);
    expect(sparkRange([2, 4], 0, 10)).toEqual([0, 10]);
  });
  it("centres a flat series (value +/- 10%) only when asked and no top is fixed", () => {
    expect(sparkRange([5, 5], 0, undefined)).toEqual([0, 5 * 1.08]);
    expect(sparkRange([5, 5], 0, undefined, true)).toEqual([4.5, 5.5]);
    expect(sparkRange([5, 5], 0, 100, true)).toEqual([0, 100]);
    expect(sparkRange([0, 0], undefined, undefined, true)).toEqual([-1, 1]);
  });
  it("keeps a flat series at its floor on the baseline", () => {
    expect(sparkRange([0, 0], 0, undefined, true)).toEqual([0, 1]);
  });
  it("leaves a moving series alone in a roomy box", () => {
    expect(sparkRange([1, 3], undefined, undefined, true)).toEqual([1, 3 * 1.08]);
  });
});

describe("units", () => {
  it("moves a word unit under the number and keeps symbols beside it", () => {
    expect(isWordUnit("games")).toBe(true);
    expect(isWordUnit("online")).toBe(true);
    for (const u of ["%", "°C", "h", "W", "MB/s", "GHz", "min", undefined]) expect(isWordUnit(u)).toBe(false);
  });
  it("is one style: small, medium, muted", () => {
    expect(UNIT_CLASS).toContain("text-[0.4em]");
  });
});

describe("LedLadder per mode", () => {
  const bg = (html: string) => [...html.matchAll(/background:([^;"]+)/g)].map((m) => m[1]);
  it("paints its zones with the dark literals, and with the shell's status variables on a light card", () => {
    const dark = renderToString(<LedLadder value={100} n={10} />);
    expect(bg(dark)).toContain("#EDB232");
    expect(bg(dark)).toContain("#F2665E");
    const light = renderToString(<SkinCtx.Provider value={{ ...skinContext("default"), shellStatus: true }}><LedLadder value={100} n={10} /></SkinCtx.Provider>);
    expect(bg(light)).toContain("var(--w-warn, #EDB232)");
    expect(bg(light)).toContain("var(--w-crit, #F2665E)");
  });
});

describe("Icon sets", () => {
  const set = { memory: { viewBox: "0 0 8 8", d: "M0 0h8v8z" } };
  it("draws a Look's glyph for a name it has and the Classic icon for one it lacks", () => {
    const ctx = { ...skinContext("default", {}), icons: set };
    const html = renderToString(
      <SkinCtx.Provider value={ctx}>
        <Icon name="memory" />
        <Icon name="speed" />
      </SkinCtx.Provider>,
    );
    expect(html).toContain('d="M0 0h8v8z"');
    expect(html.match(/data-part="icon"/g)).toHaveLength(2);
    expect(html).toContain("lucide-gauge");
  });
  it("draws Classic with no set", () => {
    expect(renderToString(<Icon name="memory" />)).toContain("lucide-cpu");
  });
});

describe("part hooks", () => {
  it("Unit, ThresholdLine and RangeBar carry theirs and the numbers they were given", () => {
    expect(renderToString(<Unit small>W</Unit>)).toContain('data-part="unit"');
    expect(renderToString(<ThresholdLine at={25} />)).toContain("top:25%");
    const up = renderToString(<RangeBar from={20} to={60} />);
    expect(up).toContain('data-part="range"');
    expect(up).toContain("bottom:20%");
    expect(up).toContain("top:40%");
    expect(renderToString(<RangeBar from={20} to={60} horizontal />)).toContain("right:40%");
  });
});
