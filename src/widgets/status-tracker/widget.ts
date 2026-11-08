// Status Tracker: a state history, one block per reading. What the registry needs; the component is its own chunk.
import { levelOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { numberOf, numberSetting, sensorSetting, stringOf, textSetting, thresholdSetting } from "../shared/settings-kit";
import type { StatusTrackerProps, Track } from "./StatusTracker";
import { meta } from "./meta";

/* Five track slots */
interface Slot {
  n: number;
  label: string;
  kind: Track["kind"];
  /** Status slots: the value that means up (threshold slots follow the Load threshold). */
  up?: string;
}
const SLOTS: Slot[] = [
  { n: 1, label: "Hottest thread", kind: "threshold" },
  { n: 2, label: "GPU load", kind: "threshold" },
  { n: 3, label: "Memory", kind: "threshold" },
  { n: 4, label: "Ethernet", kind: "status", up: "Up" },
  { n: 5, label: "Data API", kind: "status", up: "running" },
];
/** A track's own level (`track.N.warn` / `track.N.crit`, config v7), a More row of Thresholds; blank = the theme's Load threshold. */
const trackLevel = (t: Slot, level: "warn" | "crit"): ModuleSetting =>
  textSetting(`track.${t.n}.${level}`, `${t.label}: ${level === "warn" ? "warning" : "critical"}`, "", { section: "thresholds", more: true, hint: "Blank = the Load threshold; off = never" });

const settings: ModuleSetting[] = [
  ...SLOTS.map((t) => textSetting(`track${t.n}Label`, `Track ${t.n} label`, t.label, { group: "Tracks" })),
  ...SLOTS.filter((t) => t.kind === "status").map((t) => textSetting(`track${t.n}Up`, `Track ${t.n}: value that means up`, t.up, { group: "Tracks" })),
  ...SLOTS.map((t) => sensorSetting(`track${t.n}Key`, `Track ${t.n} sensor (empty = the default)`, { group: "Sensors" })),
  numberSetting("samples", "History length (samples)", 60, { min: 10, max: 240, step: 10, group: "History", tab: "behaviour" }),
  thresholdSetting("load"),
  ...SLOTS.filter((t) => t.kind === "threshold").flatMap((t) => [trackLevel(t, "warn"), trackLevel(t, "crit")]),
];
/** A track's level: its own (`track.N.*`, else the old `trackN*`), `off` = never, else the Load threshold. */
const trackLevelOf = (s: ModuleSettings, n: number, level: "warn" | "crit", load: number | undefined): number | undefined => {
  const own = levelOf(s[`track.${n}.${level}`] || s[`track${n}${level === "warn" ? "Warn" : "Crit"}`]);
  return own === "off" ? Number.POSITIVE_INFINITY : (own ?? load);
};

export default defineWidget({
  meta,
  // A summary card and a dense view of its own; the Load threshold.
  inspector: { header: "yes", compact: BOTH, thr: ["load"] },
  settings,
  render: {
    load: () => import("./StatusTracker"),
    toProps: (s: ModuleSettings): Partial<StatusTrackerProps> => {
      const load = thresholdsOf(s, "load");
      return {
        samples: numberOf(s.samples),
        tracks: SLOTS.map((t) => ({
          label: stringOf(s[`track${t.n}Label`]) ?? t.label,
          // An unset key leaves the template's detected default for this slot (StatusTracker fills it by position).
          key: stringOf(s[`track${t.n}Key`]),
          kind: t.kind,
          ...(t.kind === "threshold" ? { warn: trackLevelOf(s, t.n, "warn", load.warn), crit: trackLevelOf(s, t.n, "crit", load.crit) } : {}),
          up: stringOf(s[`track${t.n}Up`]) ?? t.up,
        })),
      };
    },
  },
  // Migrations and sample stay central (the default): settings-migrate.ts moves the old `trackNWarn` / `trackNCrit` to
  // `track.N.*` (v7); the sample is src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings.
});
