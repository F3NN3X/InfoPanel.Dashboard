// @vitest-environment happy-dom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralProvider } from "@/hooks/use-general";
import { GENERAL_DEFAULTS, type ResolvedGeneral } from "@/lib/general";
import PackStageLayers from "@/looks/pack-stage";
import type { StageViewProps } from "@/looks/pack";

const stage: StageViewProps["stage"] = {
  layers: [{ fill: "linear-gradient(#000, #111)" }, { fill: "#222", minSizeClass: "md" }],
  effects: [{ kind: "grain", cost: "animated" }, { kind: "glow", cost: "filter", px: 10 }],
};

const view = (general: Partial<ResolvedGeneral>, props: Partial<StageViewProps> = {}) =>
  render(
    <GeneralProvider value={{ ...GENERAL_DEFAULTS, ...general }}>
      <PackStageLayers stage={stage} packId="p" {...props} />
    </GeneralProvider>,
  );

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the pack stage: effects, burn-in and size classes", () => {
  it("marks layers for the drift only on a needs-shift pack with Pixel shift on", () => {
    view({ pixelShift: true }, { burnIn: "needs-shift" });
    expect(document.querySelector("[data-pack-layer='0']")?.getAttribute("data-pack-deco")).toBe("shift");
    cleanup();
    view({ pixelShift: true }, { burnIn: "static-safe" });
    expect(document.querySelector("[data-pack-layer='0']")?.getAttribute("data-pack-deco")).toBe("");
    cleanup();
    view({}, { burnIn: "needs-shift" });
    expect(document.querySelector("[data-pack-layer='0']")?.getAttribute("data-pack-deco")).toBe("");
  });

  it("dims the layers after the idle time without input, and wakes on input", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
    view({ idleDim: 5 }, { burnIn: "needs-dim" });
    const layer = () => document.querySelector("[data-pack-layer='0']")!;
    expect(layer().hasAttribute("data-idle")).toBe(false);
    act(() => vi.advanceTimersByTime(5 * 60_000 + 10));
    expect(layer().hasAttribute("data-idle")).toBe(true);
    act(() => window.dispatchEvent(new Event("pointerdown")));
    expect(layer().hasAttribute("data-idle")).toBe(false);
  });

  it("hides a layer under its size class and draws the effects the plan keeps", () => {
    view({}, { page: { width: 800, height: 480 } });
    expect(document.querySelectorAll("[data-pack-layer]")).toHaveLength(1);
    expect(document.querySelector("[data-pack-effect='grain']")?.hasAttribute("data-pack-animate")).toBe(true);
    expect(document.querySelector(".wp-pack-fx")?.getAttribute("style")).toContain("--wp-fx-glow: 10px");
    cleanup();
    view({}, { page: { width: 1920, height: 1080 } });
    expect(document.querySelectorAll("[data-pack-layer]")).toHaveLength(2);
  });

  it("sets data-pack-lite on the root in lite mode and removes it again", () => {
    const { unmount } = view({ maxFps: 30 });
    expect(document.documentElement.hasAttribute("data-pack-lite")).toBe(true);
    expect(document.querySelector("[data-pack-effect='grain']")).toBeNull();
    unmount();
    expect(document.documentElement.hasAttribute("data-pack-lite")).toBe(false);
  });
});
