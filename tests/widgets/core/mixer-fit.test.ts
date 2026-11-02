import { describe, expect, it } from "vitest";
import { lcdBox, mixerFit, rowHeight, stepsFrom, stripWidth, thinTicks, type MixerFitInput, type MixerSize, type Step } from "@/widgets/core/mixer-fit";

const BASE: MixerFitInput = { view: "strips", vertical: true, w: 640, h: 300, count: 4, masters: 0, size: "default", meter: true, meterW: 8, fader: true, writable: true, controls: 28, scale: true, console: false, lcd: true, lcdSize: "sm", chars: 4, nameChars: 7 };
const fit = (over: Partial<MixerFitInput>) => mixerFit({ ...BASE, ...over });
const at = (size: MixerSize, dense = false, bare = false): Step => ({ size, dense, bare });
const name = (s: Step) => `${s.size}${s.bare ? "-bare" : s.dense ? "-dense" : ""}`;

describe("mixerFit", () => {
  it("keeps the rows view when asked for it, with no channels or before the zone is measured", () => {
    expect(fit({ view: "rows" }).view).toBe("rows");
    expect(fit({ count: 0 }).view).toBe("rows");
    expect(fit({ w: 0, h: 0 }).view).toBe("rows");
  });

  it("shares a wide zone out among every strip at the picked size", () => {
    const f = fit({});
    expect(f).toMatchObject({ view: "strips", n: 4, more: 0, lcd: true, size: "default", dense: false, bare: false });
    expect(f.stripW * 4 + 3 * f.gap).toBeLessThanOrEqual(640);
    expect(f.stripW).toBeGreaterThanOrEqual(stripWidth(BASE, at("default")));
  });

  it("steps the size down, then tightens, then goes bare, before it leaves a channel out", () => {
    expect(stepsFrom("lg").map(name)).toEqual(["lg", "default", "sm", "sm-dense", "sm-bare"]);
    const wide = (step: Step) => 6 * stripWidth(BASE, step);
    // just room for six default strips: lg steps down to default
    expect(fit({ size: "lg", count: 6, w: wide(at("default")) + 5 * 8 })).toMatchObject({ n: 6, more: 0, size: "default", dense: false });
    // room for six only when tight
    expect(fit({ size: "lg", count: 6, w: wide(at("sm", true)) + 5 * 4 })).toMatchObject({ n: 6, more: 0, size: "sm", dense: true, bare: false, gap: 4 });
    // only when bare (no scale), the LCD kept while it fits
    const bare = { ...BASE, lcd: false };
    expect(fit({ size: "lg", count: 6, lcd: false, w: 6 * stripWidth(bare, at("sm", true, true)) + 5 * 4 })).toMatchObject({ n: 6, more: 0, bare: true });
    // less than the barest: fewer of them, and a count of the rest
    const tightest = 6 * stripWidth(bare, at("sm", true, true)) + 5 * 4 - 10;
    const f = fit({ size: "lg", count: 6, w: tightest });
    expect(f).toMatchObject({ size: "sm", dense: true, bare: true, lcd: false });
    expect(f.n + f.more).toBe(6);
    expect(f.more).toBeGreaterThan(0);
    expect(f.n * f.stripW + f.n * 4 + 28).toBeLessThanOrEqual(tightest);
  });

  it("drops the LCD in a short zone before it gives up on the strips, then falls back to rows", () => {
    expect(fit({ h: 150 })).toMatchObject({ view: "strips", lcd: false });
    expect(fit({ h: 100 }).view).toBe("rows");
    expect(fit({ w: 40 }).view).toBe("rows");
  });

  it("leaves room for the separator before the masters, and none when every strip shown is a master", () => {
    const w = 4 * stripWidth({ ...BASE, lcd: false }, at("sm", true, true)) + 3 * 4;
    expect(fit({ size: "sm", lcd: false, w, masters: 0 }).n).toBe(4);
    expect(fit({ size: "sm", lcd: false, w, masters: 1 }).n).toBeLessThan(4);
    expect(fit({ size: "sm", lcd: false, w, masters: 4 }).n).toBe(4);
  });

  it("stacks row strips, stepping down before it leaves any out, and leaves room for the masters' separator", () => {
    const rows = { vertical: false, w: 400, count: 4 } as const;
    // the strips, their gaps and the 4px below them
    const denseH = 4 * rowHeight({ ...BASE, ...rows }, at("sm", true)) + 3 * 4 + 4;
    expect(fit({ ...rows, h: denseH })).toMatchObject({ view: "strips", n: 4, more: 0, dense: true, bare: false });
    const bareH = 4 * rowHeight({ ...BASE, ...rows, lcd: false }, at("sm", true, true)) + 3 * 4 + 4;
    expect(fit({ ...rows, h: bareH })).toMatchObject({ n: 4, more: 0, bare: true, lcd: false });
    // the separator before a master pushes the last row out
    expect(fit({ ...rows, h: bareH, masters: 1 })).toMatchObject({ bare: true, more: 1 });
    expect(fit({ ...rows, h: 1000 })).toMatchObject({ n: 4, size: "default", dense: false });
    expect(fit({ vertical: false, w: 180 }).view).toBe("rows");
  });

  it("sizes the LCD view's text to fill the zone, never under the picked size", () => {
    const big = fit({ view: "lcd", w: 440, h: 400, count: 4 });
    expect(big).toMatchObject({ view: "lcd", n: 4, more: 0 });
    expect(big.font).toBeGreaterThan(14);
    expect(big.font * 1.5 * 4).toBeLessThanOrEqual(400);
    expect(fit({ view: "lcd", w: 440, h: 100, count: 4 }).font).toBeLessThan(big.font);
    // too many lines for the picked size: the rest are counted
    const short = fit({ view: "lcd", h: 90, count: 6 });
    expect(short.font).toBe(14);
    expect(short.n + short.more).toBe(6);
    expect(fit({ view: "lcd", w: 100 }).view).toBe("rows");
  });

  it("reserves the LCD separator between the masters and the channels", () => {
    const h = 16 + 4 * Math.ceil(14 * 1.5);
    expect(fit({ view: "lcd", w: 120, h, count: 4, nameChars: 40 }).n).toBe(4);
    expect(fit({ view: "lcd", w: 120, h, count: 4, nameChars: 40, masters: 1 }).n).toBeLessThan(4);
  });

  it("gives LCD columns room for their names, on two rows where one row is too narrow", () => {
    const one = fit({ view: "lcd", vertical: false, w: 440, h: 120, count: 3, nameChars: 7 });
    expect(one).toMatchObject({ n: 3, rows: 1 });
    expect(one.stripW).toBeGreaterThanOrEqual(7 * one.font * 0.68);
    const two = fit({ view: "lcd", vertical: false, w: 440, h: 400, count: 6, nameChars: 8 });
    expect(two).toMatchObject({ n: 6, rows: 2 });
    expect(two.stripW).toBeGreaterThanOrEqual(8 * two.font * 0.68);
    expect(fit({ view: "lcd", vertical: false, h: 40 }).view).toBe("rows");
    expect(lcdBox("sm", 4).w).toBeGreaterThan(0);
  });

  it("widens a strip for a console cap, the scale and a long LCD readout", () => {
    const d = at("default");
    const plain = stripWidth({ ...BASE, scale: false, lcd: false }, d);
    expect(stripWidth({ ...BASE, scale: false, lcd: false, console: true }, d)).toBeGreaterThan(plain);
    expect(stripWidth({ ...BASE, lcd: false }, d)).toBeGreaterThan(plain);
    expect(stripWidth({ ...BASE, lcdSize: "lg", chars: 5 }, d)).toBeGreaterThan(stripWidth(BASE, d));
    // a read-only fader is its track, with no thumb, and a strip with no controls row is shorter
    const flat = { ...BASE, w: 400 };
    expect(rowHeight({ ...flat, writable: false, controls: 0 }, d)).toBeLessThan(rowHeight(flat, d));
  });
});

describe("thinTicks", () => {
  const linear = (v: number) => v / 100;
  const TICKS = [0, 25, 50, 75, 100];

  it("keeps every tick on a long scale, and all of them before it is measured", () => {
    expect(thinTicks(TICKS, linear, 200, 14)).toEqual([100, 75, 50, 25, 0]);
    expect(thinTicks(TICKS, linear, 0, 14)).toEqual([100, 75, 50, 25, 0]);
  });

  it("keeps the ends first on a short scale, then what still has room", () => {
    expect(thinTicks(TICKS, linear, 40, 14)).toEqual([100, 50, 0]);
    expect(thinTicks(TICKS, linear, 20, 14)).toEqual([100, 0]);
    expect(thinTicks(TICKS, linear, 10, 14)).toEqual([100]);
  });

  it("keeps a single tick, and a duplicated one once", () => {
    expect(thinTicks([50], linear, 10, 14)).toEqual([50]);
    expect(thinTicks([0, 50, 50, 100], linear, 200, 14)).toEqual([100, 50, 0]);
    // two ticks at one position (a taper that flattens them): the first kept wins
    expect(thinTicks([0, 1, 100], () => 0.5, 200, 14)).toEqual([100]);
  });
});
