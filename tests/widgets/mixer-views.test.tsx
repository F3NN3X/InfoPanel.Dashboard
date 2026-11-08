// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { audioRefusal, type AudioState } from "@/lib/audio-control";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import snapshot from "@/widgets/__fixtures__/snapshot.json";
import { lcdAppearanceFor } from "@/widgets/core/mixer-views";
import { toFlat } from "@/widgets/data-adapter";
import { sensorStore } from "@/lib/sensor-store";
import type { ShellProps } from "@/widgets/kit";
import { mixerLookOf } from "@/widgets/shared/audio-settings";
import StreamMixer from "@/widgets/stream-mixer/StreamMixer";
import VolumeMixer from "@/widgets/volume-mixer/VolumeMixer";
import WaveLink from "@/widgets/wave-link/WaveLink";

vi.mock("@/lib/wavelink", async (orig) => ({ ...(await orig<typeof import("@/lib/wavelink")>()), ...(await import("@/widgets/__fixtures__/wavelink")).wavelinkMock() }));
let AUDIO: AudioState = {
  windows: { available: true, outputs: [{ id: "o1", name: "Speakers", volume: 30, muted: false, default: true }], inputs: [{ id: "i1", name: "Mic", volume: 60, muted: true, default: true }], apps: ["Spotify", "Discord", "Game", "Chrome"].map((name, i) => ({ id: `${name.toLowerCase()}.exe`, name, volume: 20 + i * 15, muted: false, deviceId: "o1" })) },
  wavelink: { status: "absent", channels: [], mixes: [] },
};
const AUDIO_SAVED = AUDIO;
const mocksWavelink = () => {
  AUDIO = { ...AUDIO, wavelink: { status: "up", channels: [{ id: "c1", name: "Music", type: "Channel", level: 40, muted: false, mixes: [] }, { id: "c2", name: "Game", type: "Channel", level: 60, muted: false, mixes: [] }], mixes: [{ id: "m1", name: "Stream", level: 80, muted: false }] } };
};
// The level-meter plugin's containers, as the meters of VolumeMixer and StreamMixer read them from the store (none when
// `LEVELS` is empty). The fast stream is a spy: the real store would open an EventSource.
let LEVELS: SensorMap = {};
const sensorListeners: ((changed: readonly string[]) => void)[] = [];
const fast = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/useSensors", async (orig) => ({ ...(await orig<typeof import("@/hooks/useSensors")>()), useFastSensors: fast }));
const written = vi.hoisted(() => vi.fn());
vi.mock("@/widgets/stream-mixer/control", async (orig) => ({ ...(await orig<typeof import("@/widgets/stream-mixer/control")>()), setVolume: written }));
vi.mock("@/lib/audio-control", async (orig) => ({ ...(await orig<typeof import("@/lib/audio-control")>()), useAudio: () => AUDIO }));

// happy-dom lays nothing out: each widget box reports this size.
let size = { w: 640, h: 300 };
beforeEach(() => {
  LEVELS = METERED;
  sensorListeners.length = 0;
  fast.mockClear();
  vi.spyOn(sensorStore, "getValues").mockImplementation(() => LEVELS);
  vi.spyOn(sensorStore, "subscribe").mockImplementation((l) => {
    sensorListeners.push(l);
    return () => {};
  });
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
  AUDIO = AUDIO_SAVED;
  LEVELS = {};
  vi.restoreAllMocks();
  cleanup();
  vi.unstubAllGlobals();
});

const data = toFlat(snapshot.sensors as SensorMap);
const METERED = Object.fromEntries(Object.entries(snapshot.sensors as SensorMap).filter(([k]) => k.startsWith("plugins.audio-level-meter.")));
const WIDGETS: [string, ComponentType<ShellProps & { mixerLook?: ReturnType<typeof mixerLookOf> }>, string][] = [
  ["StreamMixer", StreamMixer, "orientation"],
  ["VolumeMixer", VolumeMixer, "orientation"],
  ["WaveLink", WaveLink, "meterOrientation"],
];

describe.each(WIDGETS)("%s", (_id, Component, key) => {
  // The strips view in both orientations is drawn by the fit test below.
  it.each([["strips", "vertical"], ["lcd", "horizontal"]])("draws the %s view, %s, with every channel or a count of the rest", (view, orientation) => {
    size = { w: 640, h: 300 };
    const { container } = render(<Component data={data} mixerLook={mixerLookOf({ view, [key]: orientation }, key)} />);
    expect(container.querySelector(`[data-mixer-view=${view}]`)).toBeTruthy();
    expect(container.textContent).toMatch(/\d/);
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

describe.each(WIDGETS)("%s meters", (id, Component, key) => {
  const look = (extra: ModuleSettings = {}) => mixerLookOf({ view: "strips", [key]: "vertical", ...extra }, key);
  const draw = (extra?: ModuleSettings) => {
    size = { w: 900, h: 400 };
    return render(<Component data={data} mixerLook={look(extra)} />).container;
  };

  it("draws an audiocn LevelMeter of two tracks in each strip, and none in the rows view", () => {
    const c = draw();
    const strips = c.querySelectorAll("[data-slot=channel-strip]").length;
    expect(strips).toBeGreaterThan(0);
    expect(c.querySelectorAll("[data-slot=level-meter]").length).toBe(strips);
    expect(c.querySelectorAll("[data-slot=level-meter-channel]").length).toBe(strips * 2);
    cleanup();
    size = { w: 900, h: 400 };
    expect(render(<Component data={data} />).container.querySelector("[data-slot=level-meter]")).toBeNull();
  });

  it("draws no meter with the strip's Meter off", () => {
    expect(draw({ stripMeter: false }).querySelector("[data-slot=level-meter]")).toBeNull();
  });

  it("follows the meter options: variant, hold, the dB readout and the clip light", () => {
    const base = draw();
    expect(base.querySelector("[data-slot=level-meter]")?.getAttribute("data-variant")).toBe("solid");
    expect(base.querySelector("[data-slot=level-meter-hold]")).not.toBeNull();
    expect(base.querySelector("[data-slot=db-readout]")).toBeNull();
    expect(base.querySelector("[data-slot=clip-indicator-light]")).toBeNull();
    cleanup();
    const c = draw({ meterVariant: "segmented", meterHold: false, meterValue: true, meterClip: true });
    expect(c.querySelector("[data-slot=level-meter]")?.getAttribute("data-variant")).toBe("segmented");
    expect(c.querySelector("[data-slot=level-meter-hold]")).toBeNull();
    const strips = c.querySelectorAll("[data-slot=channel-strip]").length;
    expect(c.querySelectorAll("[data-slot=db-readout]").length).toBe(strips);
    expect(c.querySelectorAll("[data-slot=clip-indicator-light]").length).toBe(strips);
  });

  if (id !== "WaveLink")
    it("draws the meters at silence where the plugin reports nothing", () => {
      LEVELS = {};
      const c = draw();
      const strips = c.querySelectorAll("[data-slot=channel-strip]").length;
      expect(strips).toBeGreaterThan(0);
      expect(c.querySelectorAll("[data-slot=level-meter]").length).toBe(strips);
    });
});

describe("the meters' data", () => {
  const look = (extra: ModuleSettings = {}) => mixerLookOf({ view: "strips", orientation: "vertical", ...extra }, "orientation");

  it("keeps the fast level stream open only while strips with a meter are drawn", () => {
    size = { w: 900, h: 400 };
    render(<StreamMixer data={data} mixerLook={look({ stripMeter: false })} />);
    expect(fast).not.toHaveBeenCalledWith("plugins.audio-level-meter.");
    cleanup();
    render(<StreamMixer data={data} />);
    expect(fast).not.toHaveBeenCalledWith("plugins.audio-level-meter.");
    cleanup();
    render(<StreamMixer data={data} mixerLook={look()} />);
    expect(fast).toHaveBeenCalledWith("plugins.audio-level-meter.");
  });

  it("paints a sensor change into the strip's meter", () => {
    vi.useFakeTimers();
    try {
      LEVELS = {};
      size = { w: 900, h: 400 };
      const { container } = render(<StreamMixer data={data} mixerLook={look({ meterValue: true })} />);
      const readouts = () => [...container.querySelectorAll("[data-slot=db-readout]")].map((n) => n.textContent);
      expect(readouts().every((t) => t?.includes("∞"))).toBe(true);
      LEVELS = METERED;
      act(() => sensorListeners.forEach((l) => l(["plugins.audio-level-meter.default-audio.left-channel"])));
      // one readout tick (250 ms): it falls back to −∞ on the next, with no hold
      act(() => {
        vi.advanceTimersByTime(260);
      });
      expect(readouts().some((t) => t && !t.includes("∞"))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("survives Meter being turned off and on again in a Wave Link-sourced StreamMixer (a strip's hooks stay the same)", () => {
    mocksWavelink();
    size = { w: 900, h: 400 };
    const { container, rerender } = render(<StreamMixer data={data} source="wavelink" mixerLook={look()} />);
    expect(container.querySelectorAll("[data-slot=level-meter]").length).toBeGreaterThan(0);
    rerender(<StreamMixer data={data} source="wavelink" mixerLook={look({ stripMeter: false })} />);
    expect(container.querySelector("[data-slot=level-meter]")).toBeNull();
    rerender(<StreamMixer data={data} source="wavelink" mixerLook={look()} />);
    expect(container.querySelectorAll("[data-slot=level-meter]").length).toBeGreaterThan(0);
    // and the view going away and back
    rerender(<StreamMixer data={data} source="wavelink" mixerLook={look({ view: "rows" })} />);
    rerender(<StreamMixer data={data} source="wavelink" mixerLook={look()} />);
    expect(container.querySelectorAll("[data-slot=level-meter]").length).toBeGreaterThan(0);
  });
});

describe("Wave Link's input devices", () => {
  const look = (extra: ModuleSettings) => mixerLookOf({ view: "strips", meterOrientation: "vertical", ...extra }, "meterOrientation");
  const names = (c: HTMLElement) => [...c.querySelectorAll("[data-slot=channel-strip-title]")].map((n) => n.textContent);

  it.each(["vertical", "horizontal"])("draws them as read-only strips in a group of their own, %s", (orientation) => {
    size = { w: 900, h: 600 };
    const { container } = render(<WaveLink data={data} mixerLook={look({ meterOrientation: orientation })} />);
    // the channels, the input device, then the mixes
    expect(names(container)).toEqual(["Music", "Game", "Wave:3", "Stream Mix", "Monitor Mix"]);
    expect(container.querySelectorAll("[data-slot=mixer-separator]").length).toBe(2);
    const input = [...container.querySelectorAll("[data-slot=channel-strip]")][2];
    expect(input.querySelector("[role=slider]")).toBeNull();
    expect(input.querySelector("[data-slot=level-meter]")).not.toBeNull();
    // Wave Link meters an input device per input
    expect(input.textContent).toContain("Wave:3");
  });

  it("draws them in the LCD view between the channels and the mixes", () => {
    size = { w: 900, h: 600 };
    const { container } = render(<WaveLink data={data} mixerLook={look({ view: "lcd" })} />);
    const labels = [...container.querySelectorAll("[data-slot=lcd-display-label]")].map((n) => n.textContent);
    expect(labels.slice(0, 5)).toEqual(["Music", "Game", "Wave:3", "Stream Mix", "Monitor Mix"]);
    expect(container.querySelectorAll("[data-slot=lcd-display-separator]").length).toBe(2);
  });
});

describe("Wave Link's rows", () => {
  const rows = (w: number, h: number, extra: ModuleSettings = {}) => {
    size = { w, h };
    return render(<WaveLink data={data} meterOrientation="horizontal" {...extra} />).container;
  };
  const items = (c: HTMLElement) => [...c.querySelectorAll("li")];
  const bars = (li: Element) => li.querySelectorAll('[style*="height: 3px"]').length;

  it("keeps the mute mark, both level bars, the mix chips and the dB readout on a wide row", () => {
    const [music, game] = items(rows(640, 300));
    expect(bars(music)).toBe(2);
    expect(within(game as HTMLElement).getByRole("img", { name: "Muted" })).toBeTruthy();
    expect(music.textContent).toContain("Stream Mix");
    expect(music.textContent).toContain("Monitor Mix");
    expect(music.textContent).toContain("dB");
    expect(music.textContent).toContain("80");
  });

  it("keeps the left dB readout on a medium row", () => {
    const [music] = items(rows(220, 300));
    expect(music.textContent).not.toContain("Stream Mix");
    expect(music.querySelector(".font-mono")).not.toBeNull();
    expect(music.textContent).toContain("80");
  });

  it("keeps the fader value in a tile", () => {
    const [music] = items(rows(120, 300));
    expect(music.textContent).toContain("80%");
  });
});

describe("the Rows view's faders", () => {
  afterEach(() => audioRefusal.set(false));
  const rows = () => {
    size = { w: 640, h: 300 };
    return render(<StreamMixer data={data} />).container;
  };

  it("are sliders named after the channel, and the keyboard writes through the pointer's path", () => {
    written.mockClear();
    const first = within(rows()).getAllByRole("slider")[0];
    expect(first.getAttribute("aria-label")).toBeTruthy();
    const now = Number(first.getAttribute("aria-valuenow"));
    expect(first.getAttribute("aria-valuetext")).toBe(`${now}%`);
    expect(first.tabIndex).toBe(0);
    const press = (key: string) => fireEvent.keyDown(first, { key });
    const last = () => written.mock.calls.at(-1)![1];
    expect(written).not.toHaveBeenCalled();
    press("ArrowRight");
    expect(written).toHaveBeenCalledTimes(1);
    expect(last()).toBe(Math.min(100, now + 1));
    expect(written.mock.calls.at(-1)![0].name).toBe(first.getAttribute("aria-label"));
    press("ArrowLeft");
    expect(last()).toBe(now);
    press("ArrowUp");
    expect(last()).toBe(now + 1);
    press("ArrowDown");
    expect(last()).toBe(now);
    press("Home");
    expect(last()).toBe(0);
    press("ArrowLeft");
    expect(last()).toBe(0);
    press("End");
    expect(last()).toBe(100);
    press("ArrowRight");
    expect(last()).toBe(100);
    press("PageDown");
    expect(last()).toBe(90);
    press("PageUp");
    expect(last()).toBe(100);
    // an unrelated key writes nothing
    const calls = written.mock.calls.length;
    press("a");
    expect(written.mock.calls.length).toBe(calls);
  });

  it("announce a whole percent in range, whatever value the server holds (NaN reads as 0)", () => {
    for (const [vol, text] of [[72.4, "72%"], [140, "100%"], [-5, "0%"], [Number.NaN, "0%"]] as const) {
      AUDIO = { ...AUDIO, windows: { ...AUDIO.windows, outputs: [{ id: "o1", name: "Speakers", volume: vol, muted: false, default: true }] } };
      size = { w: 640, h: 300 };
      const first = within(render(<StreamMixer data={data} />).container).getAllByRole("slider")[0];
      expect(first.getAttribute("aria-valuetext")).toBe(text);
      expect(first.getAttribute("aria-valuenow")).toBe(text.slice(0, -1));
      cleanup();
    }
  });

  it("gives VolumeMixer's bar as a read-only meter", () => {
    size = { w: 640, h: 300 };
    const meter = within(render(<VolumeMixer data={data} />).container).getAllByRole("meter")[0];
    expect(meter.hasAttribute("tabindex")).toBe(false);
    expect(meter.getAttribute("aria-valuetext")).toBe(`${meter.getAttribute("aria-valuenow")}%`);
    expect(meter.getAttribute("aria-label")).toBeTruthy();
  });

  it("show the clip light of a refused mixer but cannot be focused or clicked to reset it", () => {
    const strips = () => {
      size = { w: 900, h: 400 };
      return render(<StreamMixer data={data} mixerLook={mixerLookOf({ view: "strips", orientation: "vertical", meterClip: true }, "orientation")} />).container;
    };
    const buttons = (c: HTMLElement) => [...c.querySelectorAll<HTMLButtonElement>("button:has([data-slot=clip-indicator-light])")];
    const open = buttons(strips());
    expect(open.length).toBeGreaterThan(0);
    for (const b of open) expect(b.disabled).toBe(false);
    cleanup();
    act(() => audioRefusal.set(true));
    const refused = buttons(strips());
    expect(refused.length).toBe(open.length);
    for (const b of refused) {
      expect(b.querySelector("[data-slot=clip-indicator-light]")).not.toBeNull();
      expect(b.disabled).toBe(true);
    }
  });

  it("ignore the keys when the server has refused writes (the body is inert)", () => {
    written.mockClear();
    act(() => audioRefusal.set(true));
    const c = rows();
    expect(c.querySelector("[inert]")).not.toBeNull();
    const sliders = [...c.querySelectorAll<HTMLElement>("[role=slider]")];
    expect(sliders.length).toBeGreaterThan(0);
    for (const s of sliders) {
      expect(s.getAttribute("aria-readonly")).toBe("true");
      expect(s.hasAttribute("tabindex")).toBe(false);
      fireEvent.keyDown(s, { key: "ArrowRight" });
    }
    expect(written).not.toHaveBeenCalled();
  });
});
