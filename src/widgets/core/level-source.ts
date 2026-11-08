// The level data of the mixer views' meters (audiocn's `LevelMeter` paints from a `FrameSource`, without React
// re-renders): Wave Link's meter emitters as they are, and a device's `left-channel` / `right-channel` sensors
// (% of full scale, as Meter Bridge reads them) as frames emitted when the store changes.
import { useEffect, useMemo, useRef } from "react";
import { useFastSensors } from "@/hooks/useSensors";
import { SILENCE_DB, gainToDb } from "@/lib/audio/decibels";
import { createFrameEmitter } from "@/lib/audio/frame-source";
import { sensorStore } from "@/lib/sensor-store";
import type { FrameSource, MeterFrame, MeterZone } from "@/lib/audio/types";
import { toFlat, type FlatData } from "../shared/data-adapter";
import { AUDIO } from "../shared/audio-device";
import { get, num } from "../kit";

/** A frame of one level per channel, each in % of full scale (linear amplitude); nothing readable = silence. */
export const levelFrame = (...pcts: number[]): MeterFrame => ({ channels: pcts.map((p) => ({ peakDb: Number.isFinite(p) && p > 0 ? gainToDb(Math.min(p, 100) / 100) : SILENCE_DB })) });

/** Whether two frames hold the same levels (a value that did not change is not emitted again). */
export const sameFrame = (a: MeterFrame | undefined, b: MeterFrame): boolean => !!a && a.channels.length === b.channels.length && a.channels.every((c, i) => c.peakDb === b.channels[i].peakDb);

/**
 * The frames of one device's level, painted by a strip's meter: the container `find` picks out of the level-meter
 * sensors (undefined = the plugin doesn't meter this device: silence). The 100 ms stream stays open while the strip is
 * mounted, and the store's changes go straight to the emitter, so only the meter paints and nothing re-renders.
 */
export function useDeviceLevel(find: (d: FlatData) => string | undefined): FrameSource<MeterFrame> {
  useFastSensors(AUDIO);
  const emitter = useMemo(() => createFrameEmitter<MeterFrame>(), []);
  const findRef = useRef(find);
  findRef.current = find;
  useEffect(() => {
    const read = () => {
      const d = toFlat(sensorStore.getValues());
      const id = findRef.current(d);
      // Only the two channels, not `readDevice`'s whole row (it runs at the stream's 10 Hz, once per strip).
      const frame = id ? levelFrame(num(get(d, `${AUDIO}${id}.left-channel`)), num(get(d, `${AUDIO}${id}.right-channel`))) : levelFrame(0, 0);
      if (!sameFrame(emitter.latest, frame)) emitter.emit(frame);
    };
    read();
    return sensorStore.subscribe((changed) => {
      if (changed.some((k) => k.startsWith(AUDIO))) read();
    });
  }, [emitter]);
  return emitter;
}

/** A meter's colour zones: green below `warnDb`, amber from it, red from `clipDb` (dBFS). */
export const meterZones = (warnDb: number, clipDb: number): MeterZone[] => [
  { fromDb: Number.NEGATIVE_INFINITY, zone: "ok" },
  { fromDb: warnDb, zone: "warn" },
  { fromDb: clipDb, zone: "clip" },
];
