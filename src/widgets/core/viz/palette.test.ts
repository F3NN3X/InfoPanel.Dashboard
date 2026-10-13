import { describe, expect, it } from "vitest";
import { RAMPS } from "../theme";
import { colorAt, paletteSpec, resolvePalette, shapeOf, stopsOf, type Rgba } from "./palette";
import { resolveLook, type VizLook } from "./types";

const look = (o: Partial<VizLook>) => resolveLook(o);

describe("stopsOf", () => {
  it("follow dims from the base to the accent by value", () => {
    expect(stopsOf(look({}))).toEqual(["color-mix(in oklab, var(--accent) 40%, #18181c)", "var(--accent)"]);
  });
  it("follow keeps a legacy ramp name, and ignores a custom colour", () => {
    expect(stopsOf(look({ color1: "thermal" }))).toEqual(RAMPS.thermal);
    expect(stopsOf(look({ color1: "#ff0000" }))).toEqual(stopsOf(look({})));
  });
  it("solid is colour 1, or the accent", () => {
    expect(stopsOf(look({ colorMode: "solid", color1: "#ff0000" }))).toEqual(["#ff0000"]);
    expect(stopsOf(look({ colorMode: "solid" }))).toEqual(["var(--accent)"]);
  });
  it("gradient runs colours 1 → 2 → 3, repeating the last set one", () => {
    expect(stopsOf(look({ colorMode: "gradient", color1: "#111", color2: "#222", color3: "#333" }))).toEqual(["#111", "#222", "#333"]);
    expect(stopsOf(look({ colorMode: "gradient", color1: "#111", color2: "#222" }))).toEqual(["#111", "#222", "#222"]);
  });
  it("ramp takes a ramp name, or colours 1 → 3, or dims to colour 1", () => {
    expect(stopsOf(look({ colorMode: "ramp", color1: "viridis" }))).toEqual(RAMPS.viridis);
    expect(stopsOf(look({ colorMode: "ramp", color1: "#111", color3: "#333" }))).toEqual(["#111", "#333"]);
    expect(stopsOf(look({ colorMode: "ramp", color1: "#111" }))).toEqual(["color-mix(in oklab, #111 40%, #18181c)", "#111"]);
  });
});

describe("shapeOf", () => {
  it("maps the skin's meter token: segments / blocks → segments, pill, square, else round", () => {
    expect(shapeOf("auto", "segments")).toBe("segments");
    expect(shapeOf("auto", "blocks")).toBe("segments");
    expect(shapeOf("auto", "pill")).toBe("pill");
    expect(shapeOf("auto", "square")).toBe("square");
    for (const m of ["bar", "hair", "wave", undefined]) expect(shapeOf("auto", m)).toBe("round");
  });
  it("an explicit shape wins over the skin", () => {
    expect(shapeOf("pill", "segments")).toBe("pill");
  });
});

describe("paletteSpec", () => {
  it("follows the skin's glow unless glow is set, and clamps the opacity", () => {
    expect(paletteSpec(look({}), { glow: true }).glow).toBe(true);
    expect(paletteSpec(look({ glow: "off" }), { glow: true }).glow).toBe(false);
    expect(paletteSpec(look({ glow: "on" }), {}).glow).toBe(true);
    expect(paletteSpec(look({ opacity: 0 }), {}).opacity).toBe(0.1);
  });
  it("draws follow as a ramp with the track and a peak colour", () => {
    const spec = paletteSpec(look({ peakColor: "#fff" }), { meter: "segments" });
    expect(spec.mode).toBe("ramp");
    expect(spec.shape).toBe("segments");
    expect(spec.peak).toBe("#fff");
    expect(spec.track).toContain("--w-track");
  });
  it("resolves every CSS string through the resolver", () => {
    const seen: string[] = [];
    const pal = resolvePalette(paletteSpec(look({ colorMode: "solid", color1: "red" }), {}), (c) => (seen.push(c), [1, 2, 3, 1]));
    expect(pal.stops).toEqual([[1, 2, 3, 1]]);
    expect(seen).toContain("red");
  });
});

describe("colorAt", () => {
  const stops: Rgba[] = [
    [0, 0, 0, 1],
    [100, 200, 50, 1],
  ];
  it("interpolates between the stops and clamps", () => {
    expect(colorAt(stops, 0.5)).toEqual([50, 100, 25, 1]);
    expect(colorAt(stops, 2)).toEqual(stops[1]);
    expect(colorAt([stops[1]], 0.3)).toEqual(stops[1]);
  });
});
