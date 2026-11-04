import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import classic from "@/looks/classic/look.json";
import { CardFrame } from "@/widgets/core/card-frame";
import { Metric, Ring, RingStack } from "@/widgets/core/primitives";
import { safeFill, safeGradient, t3Tokens } from "@/widgets/core/t3-tokens";
import { skinContext } from "@/widgets/core/look";
import { Widget } from "@/widgets/core/Widget";

// A Look's T3 values (as look.json writes them) reaching the drawing code through <Widget t3>, not tokens set by hand.
const CLASSIC_T3 = classic.t3 as Record<string, string | number>;
const draw = (t3: Record<string, string | number>, children: () => ReactNode) =>
  renderToString(createElement(Widget, { size: "lg", title: "T", icon: "memory", t3: { ...CLASSIC_T3, ...t3 }, children }));
const GRAD = "linear-gradient(90deg, #ff4fd8 0%, var(--w-accent) 100%)";

describe("t3Tokens", () => {
  it("maps Classic's own values to nothing: v8 parity", () => {
    expect(t3Tokens(CLASSIC_T3)).toEqual({});
    expect(t3Tokens(undefined)).toEqual({});
  });
  it("maps each differing name to its token", () => {
    expect(
      t3Tokens({ "ring-style": "arc270", "border-fill": GRAD, "num-fill": GRAD, "num-effect": "chromatic", "label-glow": "accent", "series-glow": "soft", "graph-style": "line", "cell-radius": "0", "header-style": "prompt", "header-fill": GRAD, "meter-zone-style": "blend", "meter-hold-style": "dot", "spike-shape": "tick", "fader-knob-shape": "notch", "ring-cap": "butt" }),
    ).toEqual({ ringArc: 270, frame: "gradient", borderFill: GRAD, numFill: GRAD, numChroma: true, labelGlow: true, glow: true, graph: "line", cellSquare: true, header: "prompt", headerFill: GRAD, zones: "blend", hold: "dot", spike: "tick", knob: "notch", cap: "butt" });
    expect(t3Tokens({ "ring-style": "ticks" }).ringMark).toBe("ticks");
    expect(t3Tokens({ "meter-style": "blocks" }).meter).toBe("blocks");
    expect(t3Tokens({ "meter-style": "segments" }).meter).toBe("segments");
    expect(t3Tokens({ "meter-style": "bar; x" }).meter).toBeUndefined();
  });
  it("tab-label is a header, box-legend a header on its own frame (never tui's boxed padding), both off by default", () => {
    expect(t3Tokens({ "header-style": "tab-label" })).toEqual({ header: "tab-label" });
    expect(t3Tokens({ "header-style": "box-legend" })).toEqual({ header: "box-legend", frame: "legend" });
    expect(t3Tokens({ "header-style": "inline" })).toEqual({});
    expect(t3Tokens({ "header-style": "tab-label; x" })).toEqual({});
  });
  it("label-bar, bracket-line and index are headers too, none with a frame of its own (P11)", () => {
    for (const kind of ["label-bar", "bracket-line", "index"]) expect(t3Tokens({ "header-style": kind })).toEqual({ header: kind });
    expect(t3Tokens({ "header-style": "index; x" })).toEqual({});
  });
  it("chromatic is a static number effect, 270 degrees a ring style (P11: Overdrive, Holo)", () => {
    expect(t3Tokens({ "num-effect": "chromatic" })).toEqual({ numChroma: true });
    expect(t3Tokens({ "ring-style": "arc270" })).toEqual({ ringArc: 270 });
  });
});

describe("free-text T3 values", () => {
  it("keeps a font-stretch keyword or an in-range percentage, nothing that could end the declaration", () => {
    expect(t3Tokens({ "num-stretch": "82%" }).numStretch).toBe("82%");
    expect(t3Tokens({ "num-stretch": "Condensed" }).numStretch).toBe("condensed");
    for (const bad of ["100%;pointer-events:auto", "normal", "10%", "900%", "url(x)", "82%}", 82]) expect(t3Tokens({ "num-stretch": bad }).numStretch, String(bad)).toBeUndefined();
  });
  it("keeps a graph style the drawing code knows and drops the rest", () => {
    for (const ok of ["line", "step", "bars", "dots", "braille"]) expect(t3Tokens({ "graph-style": ok }).graph).toBe(ok);
    for (const bad of ["area", "line;x:y", "evil", 3]) expect(t3Tokens({ "graph-style": bad }).graph, String(bad)).toBeUndefined();
  });
});

describe("safeGradient and safeFill", () => {
  it("accept gradients with colour stops, colours and var(--w-*)", () => {
    expect(safeGradient(GRAD)).toBe(GRAD);
    expect(safeGradient("repeating-conic-gradient(from 90deg at 50% 50%, rgb(0 0 0 / 50%) 0 10deg, hsl(10 50% 50%) 10deg 20deg)")).toBeTruthy();
    expect(safeGradient("linear-gradient(to right, color-mix(in oklab, var(--w-accent) 40%, #000), red)")).toBeTruthy();
    for (const c of ["#fff", "#ff4fd8cc", "red", "rgba(1, 2, 3, .5)", "oklch(60% 0.2 30)", "var(--w-accent)"]) expect(safeFill(c), c).toBe(c);
  });
  it.each([
    ["url(", "linear-gradient(red, url(https://evil/x.png))"],
    ["a gradient over an image", "url(https://evil/x.png)"],
    ["image(", "linear-gradient(image(red), blue)"],
    ["image-set(", "linear-gradient(image-set(\"a.png\" 1x), blue)"],
    ["a semicolon", "linear-gradient(red, blue); pointer-events: auto"],
    ["a closing brace", "linear-gradient(red, blue)}"],
    ["an opening brace", "linear-gradient(red, {blue)"],
    ["a backslash", String.raw`linear-gradient(red, \75rl(x))`],
    ["an at-rule", "linear-gradient(red, @import)"],
    ["a comment", "linear-gradient(red, /* x */ blue)"],
    ["a var outside --w-", "linear-gradient(var(--secret), blue)"],
    ["a function that is not a colour", "linear-gradient(red, attr(x))"],
    ["unbalanced brackets", "linear-gradient(red, blue"],
    ["not a string", 42],
  ])("reject %s", (_, css) => {
    expect(safeGradient(css)).toBeUndefined();
    expect(safeFill(css)).toBeUndefined();
  });
  it("treats none as no fill", () => {
    expect(safeFill("none")).toBeUndefined();
    expect(safeFill("  NONE ")).toBeUndefined();
  });
});

describe("a Look's T3 through Widget", () => {
  it("border-fill draws the gradient border", () => {
    const html = draw({ "border-fill": GRAD }, () => null);
    expect(html).toContain(`${GRAD.replace(/&/g, "&amp;")} border-box`);
    expect(draw({}, () => null)).not.toContain("border-box");
  });
  it("a rejected border-fill draws today's default: no frame", () => {
    const html = draw({ "border-fill": "url(https://evil/x.png)" }, () => null);
    expect(html).not.toContain("evil");
    expect(html).not.toContain("border-box");
  });
  it("a none fill on a gradient frame keeps the border, in the accent", () => {
    const html = renderToString(createElement(CardFrame, { kind: "gradient", fill: "none" }));
    expect(html).toContain("var(--w-accent) border-box");
    expect(html).toContain("1.5px solid transparent");
    expect(renderToString(createElement(CardFrame, { kind: "gradient", fill: "url(https://evil/x.png)" }))).not.toContain("evil");
  });
  it("ring-style arc270 opens the ring and the ring stack", () => {
    expect(draw({ "ring-style": "arc270" }, () => createElement(Ring, { value: 50 }))).toContain("rotate(-135 50 50)");
    const stack = draw({ "ring-style": "arc270" }, () => createElement(RingStack, { rings: [{ v: 50, color: "red" }, { v: 20, color: "blue" }] }));
    expect(stack.match(/rotate\(-135 50 50\)/g)).toHaveLength(2);
    expect(draw({}, () => createElement(RingStack, { rings: [{ v: 50, color: "red" }] }))).not.toContain("rotate(-135");
  });
  it("ring-style segmented cuts a ring stack with the mask", () => {
    expect(draw({ "ring-style": "segmented" }, () => createElement(RingStack, { rings: [{ v: 50, color: "red" }] }))).toContain("repeating-conic-gradient");
  });
  it("label-glow sets the card's shadow, and a Classic Look sets none", () => {
    expect(draw({ "label-glow": "accent" }, () => null)).toContain("text-shadow:0 0 6px");
    expect(draw({}, () => null)).not.toContain("text-shadow");
  });
});

describe("gradient digits", () => {
  const metric = (t3: Record<string, string | number>, t: "ok" | "crit") => draw(t3, () => createElement(Metric, { label: "CPU", value: 42, t }));
  const num = (html: string) => html.match(/<span data-part="num"[^>]*>/)?.[0] ?? "";
  it("turn off the card's inherited glow, which would show through the transparent text", () => {
    const html = metric({ "num-fill": GRAD, "label-glow": "accent" }, "ok");
    expect(html).toContain("text-shadow:0 0 6px");
    expect(num(html)).toContain("color:transparent");
    expect(num(html)).toContain("text-shadow:none");
  });
  it("lose to a warn or crit tone: the status colour stays visible", () => {
    const n = num(metric({ "num-fill": GRAD }, "crit"));
    expect(n).toContain("color:var(--w-crit");
    expect(n).not.toContain("color:transparent");
  });
  it("a rejected num-fill leaves a solid number", () => {
    expect(num(metric({ "num-fill": "url(https://evil/x.png)" }, "ok"))).not.toContain("background");
  });
});

describe("skinContext with a Look's T3", () => {
  it("overrides the skin's own token, and leaves the skin alone without one", () => {
    expect(skinContext("hud", { t3: { "ring-cap": "round" } }).cap).toBe("butt");
    expect(skinContext("default", { t3: { "graph-style": "line" } }).graph).toBe("line");
    expect(skinContext("synth", { t3: CLASSIC_T3 }).graph).toBe("line");
  });
});

describe("the numeral accent tint", () => {
  const num = (t3: Record<string, string | number>) => draw(t3, () => createElement(Metric, { label: "L", value: 5 }));
  it("is not applied for a chromatic fringe alone, which keeps the text colour (Overdrive's cyan numerals)", () => {
    expect(num({ "num-effect": "chromatic" })).not.toContain("color-mix(in oklab, var(--w-accent) 55%");
    expect(num({ "num-effect": "chromatic" })).toContain("rgba(255,40,90,.7)");
  });
});
