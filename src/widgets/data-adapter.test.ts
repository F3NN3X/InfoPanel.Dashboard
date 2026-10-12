import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import { get, hw, num } from "./core/data";
import snapshot from "./__fixtures__/snapshot.json";
import { toFlat, widgetImage } from "./data-adapter";

describe("toFlat", () => {
  it("joins a value and its unit with a space", () => {
    expect(toFlat({ a: { value: 62.5, unit: "%" } }).a).toBe("62.5 %");
  });

  it("gives the number alone for an empty unit", () => {
    expect(toFlat({ a: { value: 3, unit: "" } }).a).toBe("3");
  });

  it("prefers non-empty text over the value", () => {
    const flat = toFlat({ a: { value: 1, text: "Hi", unit: "x" }, b: { value: 7, text: "", unit: "W" } });
    expect(flat.a).toBe("Hi");
    expect(flat.b).toBe("7 W");
  });

  it("leaves out NaN and valueless keys", () => {
    const flat = toFlat({ a: { value: NaN, unit: "%" }, b: { unit: "" }, c: { text: "", unit: "" } });
    expect(flat).toEqual({});
    expect(get(flat, "a", "fb")).toBe("fb");
    expect(num(flat.a)).toBeNaN();
  });

  it("is memoised per map identity", () => {
    const map: SensorMap = { a: { value: 1, unit: "" } };
    expect(toFlat(map)).toBe(toFlat(map));
    expect(toFlat({ ...map })).not.toBe(toFlat(map));
  });

  it("flattens a real snapshot the core can read", () => {
    const flat = toFlat(snapshot.sensors as SensorMap);
    const found = hw(flat);
    expect(found.cpu).toBeTruthy();
    expect(found.gpu).toBeTruthy();
    expect(found.disks.length).toBeGreaterThanOrEqual(1);
    expect(found.adapters.length).toBeGreaterThanOrEqual(1);
    expect(Number.isFinite(num(get(flat, "system.cpu.load")))).toBe(true);
  });
});

describe("widgetImage", () => {
  it("passes through remote URLs and drops empty values", () => {
    expect(widgetImage("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(widgetImage("")).toBeUndefined();
    expect(widgetImage(undefined)).toBeUndefined();
  });

  it("resolves Data API image paths against the API", () => {
    expect(widgetImage("/api/images/p/i")).toMatch(/\/api\/images\/p\/i$/);
  });
});
