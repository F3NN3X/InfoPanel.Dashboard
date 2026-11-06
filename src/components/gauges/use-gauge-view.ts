/**
 * What the Gauges view remembers on this computer, apart from any gauge (spec §5): the sensor a preview reads,
 * whether the editor's stage follows it, and how the stage labels the range. None of it is saved with a gauge,
 * written to the config or exported, and none of it writes to the alert rules (Q39).
 */
import { useState } from "react";
import { useSensors } from "@/hooks/useSensors";
import { sensorAt } from "@/lib/sensors";

const KEY = "infopanel-studio:gauge-view";

export interface GaugeViewPrefs {
  /** The Data API key a preview reads (null: the sweep). */
  sensor: string | null;
  /** The editor's stage follows the sensor instead of the scrubber. */
  live: boolean;
  /** The stage labels both ends of the range. */
  endLabels: boolean;
  /** The stage takes its colour zones from the alert rule that watches the sensor. */
  follow: boolean;
}

const DEFAULTS: GaugeViewPrefs = { sensor: null, live: true, endLabels: true, follow: true };

function read(): GaugeViewPrefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Partial<GaugeViewPrefs> | null;
    return {
      sensor: typeof raw?.sensor === "string" && raw.sensor ? raw.sensor : null,
      live: typeof raw?.live === "boolean" ? raw.live : DEFAULTS.live,
      endLabels: typeof raw?.endLabels === "boolean" ? raw.endLabels : DEFAULTS.endLabels,
      follow: typeof raw?.follow === "boolean" ? raw.follow : DEFAULTS.follow,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useGaugeView(): [GaugeViewPrefs, (patch: Partial<GaugeViewPrefs>) => void] {
  const [prefs, setPrefs] = useState(read);
  const patch = (p: Partial<GaugeViewPrefs>) =>
    setPrefs((cur) => {
      const next = { ...cur, ...p };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Storage is off: the choice lasts until the page closes.
      }
      return next;
    });
  return [prefs, patch];
}

/** What a gauge reads from the preview sensor: where it sits in `min`..`max` (0..1, null while there is no reading) and the sensor's name. */
export function useLiveReading(prefs: GaugeViewPrefs, min: number, max: number): { p: number | null; value: number | null; name: string | null; unit: string } {
  const readings = useSensors(prefs.sensor ? [prefs.sensor] : []);
  const sensor = prefs.sensor ? sensorAt(readings, prefs.sensor) : undefined;
  const value = typeof sensor?.value === "number" && Number.isFinite(sensor.value) ? sensor.value : null;
  const name = sensor?.name ?? (prefs.sensor ? (prefs.sensor.split(/[.:/]/).at(-1) ?? prefs.sensor) : null);
  return { p: value === null || max <= min ? null : Math.min(1, Math.max(0, (value - min) / (max - min))), value, name, unit: sensor?.unit ?? "" };
}
