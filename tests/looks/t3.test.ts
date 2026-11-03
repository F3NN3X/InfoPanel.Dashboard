import { describe, expect, it } from "vitest";
import { GLIDE_MS, RAMP_BASE, RAMP_START, RING_GAP, RING_T, RING_TRACK } from "../../src/looks/data-viz.ts";
import { STATUS } from "../../src/looks/status.ts";
import { CLASSIC_T3, T3_ALIAS_ROOTS, T3_TOKENS } from "../../src/looks/t3.ts";
import { heat, rampColor, TEXT_VARS, TONES } from "../../src/widgets/core/theme.ts";

// D13: a Look defines or aliases every required T3 token. Classic is the first Look; `ext` (keys outside the contract)
// must stay empty for the built-ins, so a name outside the contract fails here.
describe("the Classic Look's T3 coverage", () => {
  it("defines every required token and nothing else", () => {
    expect(new Set(T3_TOKENS).size).toBe(T3_TOKENS.length);
    expect(Object.keys(CLASSIC_T3).sort()).toEqual([...T3_TOKENS].sort());
    for (const name of T3_TOKENS) expect(CLASSIC_T3[name], name).not.toBeUndefined();
  });

  it("only aliases a T3 token or a T1 name", () => {
    const known = new Set<string>([...T3_TOKENS, ...T3_ALIAS_ROOTS]);
    for (const [name, value] of Object.entries(CLASSIC_T3)) {
      for (const [, ref] of String(value).matchAll(/\{([\w.-]+)\}/g)) expect(known.has(ref), `${name} -> {${ref}}`).toBe(true);
    }
  });

  it("holds today's value for what widgets read", () => {
    expect(CLASSIC_T3["status-ok"]).toBe(STATUS.ok);
    expect(CLASSIC_T3["ring-width"]).toBe(RING_T);
    expect(CLASSIC_T3["ring-gap"]).toBe(RING_GAP);
    expect(CLASSIC_T3["ring-track"]).toBe(RING_TRACK);
    expect(CLASSIC_T3["motion-data"]).toBe(`${GLIDE_MS}ms`);
    expect(CLASSIC_T3["axis-label"]).toBe("{faint}");
    expect(TONES.ok).toBe("var(--accent)");
  });
});

// The one intended Classic repaint: a ramp starts from the material's fill, not a fixed #18181c.
describe("the ramp start", () => {
  it("is the material's fill, with the old colour as the dark-card fallback", () => {
    expect(RAMP_BASE).toBe(`var(--w-fill, ${RAMP_START})`);
    expect(heat(50)).toContain(RAMP_BASE);
  });

  it("is set by the shell on light and theme cards, not on dark ones", () => {
    expect(TEXT_VARS.dark["--w-fill"]).toBeUndefined();
    expect(TEXT_VARS.light["--w-fill"]).toBe("#f4f4f5");
    expect(TEXT_VARS.theme["--w-fill"]).toBe("hsl(var(--card))");
  });

  it("starts a canvas accent ramp from the given base, and keeps #18181c without one", () => {
    expect(rampColor(0, "accent", "#34d399")).toBe("rgb(24,24,28)");
    expect(rampColor(0, "accent", "#34d399", "#f4f4f5")).toBe("rgb(244,244,245)");
    expect(rampColor(1, "accent", "#34d399", "#f4f4f5")).toBe("rgb(52,211,153)");
    expect(rampColor(0, "thermal", "#34d399", "#f4f4f5")).toBe("rgb(30,58,138)");
  });
});
