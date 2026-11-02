// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as sensors from "@/hooks/useSensors";
import type { MeterFrame } from "@/lib/audio/types";
import { sensorStore } from "@/lib/sensor-store";
import type { SensorMap } from "@/modules/types";
import { useDeviceLevel } from "@/widgets/core/level-source";
import { mixerGrid } from "@/widgets/core/mixer-views";

const P = "plugins.audio-level-meter.default-audio.";
const levels = (l: number, r: number): SensorMap => ({ [`${P}device-name`]: { value: 0, text: "System", unit: "" }, [`${P}left-channel`]: { value: l, unit: "%" }, [`${P}right-channel`]: { value: r, unit: "%" } });

describe("useDeviceLevel", () => {
  afterEach(() => vi.restoreAllMocks());

  it("opens the fast stream while mounted, and paints a sensor change into its source without a render", () => {
    const fast = vi.spyOn(sensors, "useFastSensors").mockImplementation(() => {});
    let values = levels(40, 25);
    let listener: (changed: readonly string[]) => void = () => {};
    vi.spyOn(sensorStore, "getValues").mockImplementation(() => values);
    vi.spyOn(sensorStore, "subscribe").mockImplementation((l) => {
      listener = l;
      return () => {};
    });
    let renders = 0;
    const { result } = renderHook(() => {
      renders++;
      return useDeviceLevel((d) => (Object.keys(d).some((k) => k.startsWith("plugins.audio-level-meter.default-audio.")) ? "default-audio" : undefined));
    });
    expect(fast).toHaveBeenCalledWith("plugins.audio-level-meter.");
    const seen: MeterFrame[] = [];
    result.current.subscribe((f) => seen.push(f));
    const before = renders;
    values = levels(80, 25);
    act(() => listener([`${P}left-channel`]));
    expect(seen).toHaveLength(1);
    expect(seen[0].channels[0].peakDb).toBeCloseTo(-1.94, 1);
    // the same level again, and another plugin's change, emit nothing; nothing re-rendered
    act(() => listener([`${P}left-channel`]));
    act(() => listener(["libre.cpu"]));
    expect(seen).toHaveLength(1);
    expect(renders).toBe(before);
  });

  it("reads silence for a device the plugin doesn't meter", () => {
    vi.spyOn(sensors, "useFastSensors").mockImplementation(() => {});
    vi.spyOn(sensorStore, "getValues").mockImplementation(() => ({}));
    const { result } = renderHook(() => useDeviceLevel(() => undefined));
    const seen: MeterFrame[] = [];
    result.current.subscribe((f) => seen.push(f));
    expect((result.current as unknown as { latest: MeterFrame }).latest.channels.map((c) => c.peakDb)).toEqual([Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]);
  });
});

describe("mixerGrid", () => {
  it("lays the groups out in a row of columns (vertical) or a column of rows (horizontal), each after a separator", () => {
    expect(mixerGrid(true, false, false)).toEqual({ areas: "'channels'", tracks: "minmax(0,1fr)" });
    expect(mixerGrid(true, true, true)).toEqual({ areas: "'channels separator-in inputs separator master'", tracks: "minmax(0,1fr) auto auto auto auto" });
    expect(mixerGrid(false, false, true)).toEqual({ areas: "'channels' 'separator' 'master'", tracks: "minmax(0,1fr) auto auto" });
  });
});
