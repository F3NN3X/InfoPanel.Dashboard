import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { MixFader } from "@/widgets/stream-mixer/Fader";
import { CardFrame } from "@/widgets/core/card-frame";
import { skinContext } from "@/widgets/core/look";
import { HoldMark, LedLadder, Num, Ring, Spark } from "@/widgets/core/primitives";
import { SKINS, SkinCtx } from "@/widgets/core/theme";
import { Widget } from "@/widgets/core/Widget";
import type { SkinTokens } from "@/widgets/core/types";

// The data variants a Look sets (SkinTokens numFill, ringArc, ringMark, zones, hold, spike, knob, borderFill), drawn through a throwaway skin.
const under = (tokens: Partial<SkinTokens>, node: ReactNode) => renderToString(<SkinCtx.Provider value={{ ...skinContext("default", {}), ...tokens }}>{node}</SkinCtx.Provider>);

describe("number fill", () => {
  it("paints the digits with the gradient and drops the glow that would draw over them", () => {
    const html = under({ numFill: "linear-gradient(red, blue)", numGlow: true }, <Num>42</Num>);
    expect(html).toContain("background-clip:text");
    expect(html).toContain("linear-gradient(red, blue)");
    expect(html).toContain("text-shadow:none");
    expect(html).not.toContain("var(--w-accent), 0 0 14px");
  });
  it("leaves a solid number as it was", () => {
    expect(under({}, <Num>42</Num>)).not.toContain("background-clip");
  });
});

describe("ring arc and marks", () => {
  const dashes = (html: string) => html.match(/stroke-dasharray/g)?.length ?? 0;
  it("a Look's 270 draws an open arc, and a widget's own sweep still wins", () => {
    expect(dashes(under({ ringArc: 270 }, <Ring value={50} />))).toBe(2);
    expect(under({ ringArc: 270 }, <Ring value={50} />)).not.toContain("stroke-dashoffset");
    expect(under({ ringArc: 270 }, <Ring value={50} sweep={360} />)).toContain("stroke-dashoffset");
  });
  it("cuts the ring into segments or ticks with a mask, and leaves an arc unmasked", () => {
    expect(under({ ringMark: "segmented" }, <Ring value={50} />)).toContain("26deg");
    expect(under({ ringMark: "ticks" }, <Ring value={50} sweep={270} />)).toContain("2deg");
    expect(under({}, <Ring value={50} />)).not.toContain("mask");
  });
});

describe("meter zones and hold shapes", () => {
  const fills = (html: string) => new Set([...html.matchAll(/style="background:([^;"]+);opacity:1"/g)].map((m) => m[1]));
  it("steps through three colours by default and blends between the zones with blend", () => {
    expect(fills(under({}, <LedLadder value={100} />)).size).toBe(3);
    expect(fills(under({ zones: "blend" }, <LedLadder value={100} />)).size).toBeGreaterThan(3);
  });
  it("draws the hold as a line, a dot or a block", () => {
    const line = under({}, <HoldMark at={50} />);
    const dot = under({ hold: "dot" }, <HoldMark at={50} />);
    const block = under({ hold: "block" }, <HoldMark at={50} />);
    expect(line).toContain("rounded-full");
    expect(dot).toContain("rounded-full");
    expect(dot).toContain("margin:auto 0");
    expect(line).not.toContain("margin:auto");
    expect(block).not.toContain("rounded-full");
  });
});

describe("spike shapes", () => {
  const spark = <Spark values={[1, 5, 2, 8, 3, 9, 4]} marks="last" />;
  it("marks the last sample with a dot, a tick or a bar", () => {
    expect(under({}, spark)).toContain("rounded-full");
    expect(under({ spike: "tick" }, spark)).toContain('data-spike="tick"');
    const bar = under({ spike: "bar" }, spark);
    expect(bar).toContain('data-spike="bar"');
    expect(bar).toMatch(/height:\d/);
    expect(under({ spike: "tick" }, spark)).not.toContain("rounded-full");
  });
});

describe("fader knob shapes", () => {
  const knob = (tokens: Partial<SkinTokens>, vertical = false) =>
    under(tokens, <MixFader value={40} color="red" segs={8} mode="bar" vertical={vertical} onChange={() => {}} />).match(/class="[^"]*bg-white[^"]*"/)?.[0] ?? "";
  it("keeps the pill, and draws a bar, a square or a notch", () => {
    expect(knob({})).toContain("rounded-full");
    expect(knob({ knob: "bar" })).not.toContain("rounded-full");
    expect(knob({ knob: "square" })).toContain("h-3 w-3");
    expect(knob({ knob: "notch" })).toContain("bottom-0 top-0");
    expect(knob({ knob: "notch" }, true)).toContain("left-0 right-0");
  });
});

describe("gradient border", () => {
  it("is a click-through layer painted with the fill, the card's padding box masked out", () => {
    const html = renderToString(<CardFrame kind="gradient" fill="linear-gradient(red, blue)" />);
    expect(html).toContain("linear-gradient(red, blue) border-box");
    expect(html).toContain("mask-composite:exclude");
    expect(html).toContain("pointer-events-none");
  });
  it("falls back to the accent without a fill", () => {
    expect(renderToString(<CardFrame kind="gradient" />)).toContain("var(--w-accent) border-box");
  });
});

// L19 and L20: skin-id branches turned into tokens, and the D11 names that gained code. Each runs through a throwaway skin.
describe("tokens that replaced skin-id branches and D11 names", () => {
  const html = (tokens: Partial<SkinTokens>, extra: Record<string, unknown> = {}) => {
    SKINS.qa = { ...SKINS.default, ...tokens };
    // biome-ignore lint/correctness/noChildrenProp: the Widget takes a render function as children.
    return renderToString(createElement(Widget, { skin: "qa", size: "lg", title: "T", icon: "memory", children: () => createElement(Spark, { values: [1, 5, 2, 8, 3, 9] }), ...extra }));
  };
  afterEach(() => {
    delete SKINS.qa;
  });

  it("boxed: the tui padding and the title on the border come from the token, not the skin id", () => {
    expect(html({ boxed: true })).toContain("px-[14px]");
    expect(html({})).not.toContain("px-[14px]");
  });
  it("label-glow: a soft glow on the card's text, only when set", () => {
    expect(html({ labelGlow: true })).toContain("text-shadow:0 0 6px");
    expect(html({})).not.toContain("text-shadow");
  });
  it("header prompt and icon-badge draw their own header", () => {
    expect(html({ header: "prompt" })).toContain("&gt;");
    const badge = html({ header: "icon-badge" });
    expect(badge).toContain("rounded-md");
    expect(badge).toContain("h-6 w-6");
    expect(html({})).not.toContain("h-6 w-6");
  });
  it("graph-style and series-glow: the skin's graph and glow reach the sparkline", () => {
    expect(html({ graph: "line" })).not.toContain("url(#sp");
    expect(html({})).toContain("url(#sp");
    const paths = (h: string) => h.match(/<path/g)?.length ?? 0;
    expect(paths(html({ glow: true }))).toBeGreaterThan(paths(html({})));
  });
  it("num-effect chromatic: two colour fringes, and a gradient fill beats them", () => {
    expect(under({ numChroma: true }, <Num>1</Num>)).toContain("rgba(255,40,90");
    expect(under({ numChroma: true, numFill: "linear-gradient(red, blue)" }, <Num>1</Num>)).not.toContain("rgba(255,40,90");
  });
  it("cell-radius: the skins that were square by name are square by token; the rest keep rounded cells", () => {
    for (const id of ["tui", "hud", "retro"]) expect(SKINS[id].cellSquare, id).toBe(true);
    expect(SKINS.default.cellSquare).toBeUndefined();
  });
  it("numReadout and plainSections are set on the skins that had them by name", () => {
    expect([SKINS.retro.numReadout, SKINS.tui.numReadout, SKINS.ink.plainSections, SKINS.ink.strokeFixed, SKINS.hud.cap, SKINS.tui.cap]).toEqual([true, true, true, 1, "butt", "butt"]);
    expect(SKINS.default.numReadout ?? SKINS.default.plainSections ?? SKINS.default.cap).toBeUndefined();
  });
});
