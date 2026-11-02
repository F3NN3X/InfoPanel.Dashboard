// @vitest-environment happy-dom
import { cleanup, render, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioState } from "@/lib/audio-control";
import type { SensorMap } from "@/modules/types";
import snapshot from "@/widgets/__fixtures__/snapshot.json";
import { lcdAppearanceFor } from "@/widgets/core/mixer-views";
import { toFlat } from "@/widgets/data-adapter";
import type { ShellProps } from "@/widgets/kit";
import { mixerLookOf } from "@/widgets/registry/audio-settings";
import StreamMixer from "@/widgets/StreamMixer";
import VolumeMixer from "@/widgets/VolumeMixer";
import WaveLink from "@/widgets/WaveLink";

vi.mock("@/lib/wavelink", async (orig) => ({ ...(await orig<typeof import("@/lib/wavelink")>()), ...(await import("@/widgets/__fixtures__/wavelink")).wavelinkMock() }));
const AUDIO: AudioState = {
  windows: { available: true, outputs: [{ id: "o1", name: "Speakers", volume: 30, muted: false, default: true }], inputs: [{ id: "i1", name: "Mic", volume: 60, muted: true, default: true }], apps: ["Spotify", "Discord", "Game", "Chrome"].map((name, i) => ({ id: `${name.toLowerCase()}.exe`, name, volume: 20 + i * 15, muted: false, deviceId: "o1" })) },
  wavelink: { status: "absent", channels: [], mixes: [] },
};
vi.mock("@/lib/audio-control", async (orig) => ({ ...(await orig<typeof import("@/lib/audio-control")>()), useAudio: () => AUDIO }));

// happy-dom lays nothing out: each widget box reports this size.
let size = { w: 640, h: 300 };
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(private cb: ResizeObserverCallback) {}
      observe() {
        this.cb([{ contentRect: { width: size.w, height: size.h }, borderBoxSize: [{ inlineSize: size.w, blockSize: size.h + 60 }] } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
      }
      disconnect() {}
    }
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const data = toFlat(snapshot.sensors as SensorMap);
const WIDGETS: [string, ComponentType<ShellProps & { mixerLook?: ReturnType<typeof mixerLookOf> }>, string][] = [
  ["StreamMixer", StreamMixer, "orientation"],
  ["VolumeMixer", VolumeMixer, "orientation"],
  ["WaveLink", WaveLink, "meterOrientation"],
];

describe.each(WIDGETS)("%s", (_id, Component, key) => {
  it.each(["strips", "lcd"])("draws the %s view in both orientations, with every channel or a count of the rest", (view) => {
    for (const orientation of ["vertical", "horizontal"]) {
      size = { w: 640, h: 300 };
      const { container, unmount } = render(<Component data={data} mixerLook={mixerLookOf({ view, [key]: orientation }, key)} />);
      expect(container.querySelector(`[data-mixer-view=${view}]`), `${view} ${orientation}`).toBeTruthy();
      expect(container.textContent).toMatch(/\d/);
      unmount();
    }
  });

  it("falls back to the rows view where a strip can't fit", () => {
    size = { w: 120, h: 60 };
    const { container } = render(<Component data={data} mixerLook={mixerLookOf({ view: "strips" }, key)} />);
    expect(container.querySelector("[data-mixer-view]")).toBeNull();
  });

  it("draws no fader knob and no slider when it can't write", () => {
    size = { w: 640, h: 300 };
    const { container } = render(<Component data={data} mixerLook={mixerLookOf({ view: "strips" }, key)} />);
    const writable = _id === "StreamMixer";
    expect(container.querySelectorAll("[data-slot=fader-thumb]").length > 0).toBe(writable);
    expect(within(container).queryAllByRole("slider").length > 0).toBe(writable);
  });

  it.each(["vertical", "horizontal"])("draws every %s strip where they fit, and the rest as a count where they don't", (orientation) => {
    const strips = (w: number, h: number) => {
      size = { w, h };
      const { container, unmount } = render(<Component data={data} mixerLook={mixerLookOf({ view: "strips", [key]: orientation }, key)} />);
      const drawn = container.querySelectorAll("[data-slot=channel-strip]").length;
      const more = Number(container.querySelector("[data-mixer-more]")?.getAttribute("data-mixer-more") ?? 0);
      unmount();
      return { drawn, more };
    };
    const all = strips(4000, 4000);
    expect(all.more).toBe(0);
    expect(all.drawn).toBeGreaterThan(1);
    // a zone narrower (shorter) than the barest strips need
    const tight = orientation === "vertical" ? strips(all.drawn * 52, 300) : strips(400, all.drawn * 52);
    expect(tight.drawn).toBeGreaterThan(0);
    expect(tight.more).toBeGreaterThan(0);
    expect(tight.drawn + tight.more).toBe(all.drawn);
  });
});

describe("lcdAppearanceFor", () => {
  it("follows the widget's surface on Auto, never the page's colour scheme", () => {
    expect(lcdAppearanceFor("auto", "light")).toBe("light");
    expect(lcdAppearanceFor("auto", "dark")).toBe("dark");
    expect(lcdAppearanceFor("auto", "theme")).toBe("dark");
    expect(lcdAppearanceFor("light", "dark")).toBe("light");
  });
});
