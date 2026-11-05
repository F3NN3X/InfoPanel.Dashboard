import { describe, expect, it } from "vitest";
import { CHANGES_KEPT, HistoryRecorder } from "@/lib/data-history";
import type { SensorMap } from "@/modules/types";

const num = (value: number): SensorMap[string] => ({ value, unit: "°C" });
const txt = (text: string): SensorMap[string] => ({ text, unit: "" });

describe("HistoryRecorder", () => {
  it("records only the keys it watches, and seeds a new key with its current reading", () => {
    const r = new HistoryRecorder();
    const values: SensorMap = { a: num(1), b: num(2) };
    r.watch(["a"], values, 0);
    expect(r.history.get("a")).toEqual([1]);
    expect(r.sample({ a: num(3), b: num(4) }, 1000)).toBe(true);
    expect(r.history.get("a")).toEqual([1, 3]);
    expect(r.history.get("b")).toEqual([]);
  });

  it("takes one sample per gap however often it is asked", () => {
    const r = new HistoryRecorder();
    r.watch(["a"], { a: num(1) }, 0);
    expect(r.sample({ a: num(2) }, 1000)).toBe(true);
    expect(r.sample({ a: num(3) }, 1300)).toBe(false);
    expect(r.history.get("a")).toEqual([1, 2]);
  });

  it("forgets a key that leaves the watched rows", () => {
    const r = new HistoryRecorder();
    r.watch(["a", "b"], { a: num(1), b: num(2) }, 0);
    r.watch(["b"], { a: num(1), b: num(2) }, 1000);
    expect(r.history.get("a")).toEqual([]);
    expect(r.history.get("b")).toEqual([2]);
  });

  it("keeps the last distinct values of a text key, newest last, and drops repeats", () => {
    const r = new HistoryRecorder();
    r.watch(["t"], { t: txt("one") }, 0);
    r.sample({ t: txt("one") }, 1000);
    r.sample({ t: txt("two") }, 2000);
    expect(r.changesOf("t")).toEqual([{ at: 0, text: "one" }, { at: 2000, text: "two" }]);
    for (let i = 0; i < 10; i++) r.sample({ t: txt(`v${i}`) }, 3000 + i * 1000);
    expect(r.changesOf("t")).toHaveLength(CHANGES_KEPT);
    expect(r.changesOf("t").at(-1)?.text).toBe("v9");
  });

  it("starts the watched keys over on restart", () => {
    const r = new HistoryRecorder();
    r.watch(["a"], { a: num(1) }, 0);
    r.sample({ a: num(2) }, 1000);
    r.restart({ a: num(9) }, 5000);
    expect(r.history.get("a")).toEqual([9]);
    expect(r.sample({ a: num(10) }, 5100)).toBe(true);
  });
});
