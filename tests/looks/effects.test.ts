import { describe, expect, it } from "vitest";
import { effectIssues, planEffects, showsAt, sizeClassOf, type EffectEnv, type PackEffect } from "@/looks/effects";

const env = (patch: Partial<EffectEnv> = {}): EffectEnv => ({ lite: false, reduceMotion: false, limitBlur: false, solidPage: false, ...patch });
const grain: PackEffect = { kind: "grain", cost: "animated", opacity: 0.9 };

describe("planEffects", () => {
  it("caps an overlay's strength so it cannot hide a widget", () => {
    expect(planEffects([grain], env())[0]).toMatchObject({ kind: "grain", opacity: 0.4, animate: true });
  });

  it.each([
    ["lite mode", { lite: true }],
    ["reduced motion", { reduceMotion: true }],
  ])("drops grain and scanlines in %s unless the pack keeps them still", (_, patch) => {
    const fx: PackEffect[] = [grain, { kind: "scanlines", cost: "static" }, { kind: "scanlines", cost: "animated", fallback: "static" }, { kind: "vignette", cost: "static" }];
    const plan = planEffects(fx, env(patch));
    expect(plan.map((e) => e.kind)).toEqual(["scanlines", "vignette"]);
    expect(plan.every((e) => !e.animate)).toBe(true);
  });

  it("halves glow in lite mode and caps it at 24 px", () => {
    expect(planEffects([{ kind: "glow", cost: "filter", px: 80 }], env())[0].px).toBe(24);
    expect(planEffects([{ kind: "glow", cost: "filter", px: 24 }], env({ lite: true }))[0].px).toBe(12);
  });

  it("caps blur at 12 px under Limit blur, and drops it in lite mode or over a solid page", () => {
    const blur: PackEffect = { kind: "blur", cost: "filter", px: 40 };
    expect(planEffects([blur], env({ limitBlur: true }))[0].px).toBe(12);
    expect(planEffects([blur], env())[0].px).toBe(24);
    expect(planEffects([blur], env({ lite: true }))).toEqual([]);
    expect(planEffects([blur], env({ solidPage: true }))).toEqual([]);
  });

  it("hides an effect under its size class", () => {
    const fx: PackEffect[] = [{ kind: "vignette", cost: "static", minSizeClass: "md" }];
    expect(planEffects(fx, env({ sizeClass: "sm" }))).toEqual([]);
    expect(planEffects(fx, env({ sizeClass: "md" }))).toHaveLength(1);
    expect(planEffects(fx, env())).toHaveLength(1);
  });
});

describe("effectIssues", () => {
  it("accepts honest effects", () => {
    expect(effectIssues([grain, { kind: "glow", cost: "filter" }, { kind: "vignette", cost: "mask" }])).toEqual([]);
  });

  it.each([
    ["a glow that claims to be static", [{ kind: "glow", cost: "static" }]],
    ["an animated glow", [{ kind: "glow", cost: "animated" }]],
    ["an unknown cost", [{ kind: "grain", cost: "free" }]],
    ["an unknown kind", [{ kind: "rain", cost: "static" }]],
    ["a negative radius", [{ kind: "glow", cost: "filter", px: -1 }]],
    ["a bad size class", [{ kind: "grain", cost: "static", minSizeClass: "huge" }]],
    ["two animated effects", [grain, { kind: "scanlines", cost: "animated" }]],
    ["three filter effects", [{ kind: "glow", cost: "filter" }, { kind: "blur", cost: "filter" }, { kind: "glow", cost: "filter" }]],
  ])("refuses %s", (_, fx) => {
    expect(effectIssues(fx as unknown as PackEffect[])).not.toEqual([]);
  });
});

describe("size classes", () => {
  it("come from the short side", () => {
    expect([sizeClassOf(1920, 340), sizeClassOf(800, 480), sizeClassOf(1024, 700), sizeClassOf(1920, 1080), sizeClassOf(300, 2000)]).toEqual(["xs", "sm", "md", "lg", "xs"]);
  });
  it("showsAt hides below the minimum only", () => {
    expect([showsAt("md", "sm"), showsAt("md", "md"), showsAt("md", "lg"), showsAt(undefined, "xs"), showsAt("lg", undefined)]).toEqual([false, true, true, true, true]);
  });
});
