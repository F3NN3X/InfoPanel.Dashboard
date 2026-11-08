// Radial Clock Stack: day, year or week, a sensor and the next event as concentric rings. What the registry needs; the component is its own chunk.
import { clockOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting, enumSetting, formatSetting, numberOf, numberSetting, oneOf, sensorSetting, stringOf } from "../shared/settings-kit";
import { meta } from "./meta";
import type { RadialClockStackProps } from "./RadialClockStack";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    enumSetting("span", "Second ring", "year", [{ value: "year", label: "Year" }, { value: "week", label: "Week" }], { group: "Rings" }),
    enumSetting("weekStart", "Week starts", "1", [{ value: "1", label: "Monday" }, { value: "0", label: "Sunday" }], { group: "Rings", visibleIf: (v) => v.span === "week" }),
    sensorSetting("sensor", "Sensor ring", { group: "Rings", tab: "data", hint: "Empty = no sensor ring" }),
    numberSetting("sensorMin", "Sensor empty at", 0, { group: "Rings", tab: "data", visibleIf: (v) => !!v.sensor }),
    numberSetting("sensorMax", "Sensor full at", 100, { group: "Rings", tab: "data", visibleIf: (v) => !!v.sensor }),
    boolSetting("showEvent", "Next event ring", true, { group: "Rings", hint: "Fills as the next calendar event gets close; needs a calendar under Settings › Connections" }),
    numberSetting("horizon", "Event run-up (minutes)", 120, { min: 5, max: 1440, step: 5, group: "Rings", tab: "data", visibleIf: (v) => v.showEvent !== false }),
    boolSetting("showSeconds", "Seconds ring", false, { group: "Rings", hint: "Ticks every second instead of every minute" }),
    formatSetting("clock"),
  ],
  render: {
    load: () => import("./RadialClockStack"),
    toProps: (s: ModuleSettings): Partial<RadialClockStackProps> => ({
      span: oneOf(s.span, ["year", "week"]),
      weekStart: numberOf(s.weekStart),
      sensor: stringOf(s.sensor),
      sensorMin: numberOf(s.sensorMin),
      sensorMax: numberOf(s.sensorMax),
      showEvent: boolOf(s.showEvent),
      horizon: numberOf(s.horizon),
      showSeconds: boolOf(s.showSeconds),
      clock: clockOf(s),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings. It draws without sensor keys (module.tsx SENSORLESS).
});
