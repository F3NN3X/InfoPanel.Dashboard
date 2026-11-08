// Day Planner: today's calendar events on a time rail, over a weather band. What the registry needs; the component is its own chunk.
import { clockOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting, enumSetting, formatSetting, numberOf, oneOf, stringOf, textSetting } from "../shared/settings-kit";
import type { DayPlannerProps } from "./DayPlanner";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    enumSetting(
      "hours",
      "Look ahead",
      "12",
      [{ value: "6", label: "6 hours" }, { value: "12", label: "12 hours" }, { value: "24", label: "24 hours" }, { value: "36", label: "36 hours" }],
      { group: "Rail", hint: "24 and 36 hours reach into tomorrow" }
    ),
    enumSetting("orientation", "Direction", "auto", [{ value: "auto", label: "Auto" }, { value: "vertical", label: "Vertical" }, { value: "horizontal", label: "Horizontal" }], { group: "Rail" }),
    boolSetting("showWeather", "Weather band", true, { group: "Weather", hint: "Temperature and rain behind the events, from the Yr weather plugin" }),
    textSetting("location", "Weather location", "", { group: "Weather", tab: "data", hint: "Empty = the first Yr location" }),
    enumSetting("units", "Temperature unit", "C", [{ value: "C", label: "°C" }, { value: "F", label: "°F" }], { group: "Weather", tab: "data" }),
    formatSetting("clock"),
  ],
  render: {
    load: () => import("./DayPlanner"),
    toProps: (s: ModuleSettings): Partial<DayPlannerProps> => ({
      hours: numberOf(s.hours),
      orientation: oneOf(s.orientation, ["auto", "vertical", "horizontal"]),
      showWeather: boolOf(s.showWeather),
      location: stringOf(s.location),
      units: oneOf(s.units, ["C", "F"]),
      clock: clockOf(s),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings. It draws without sensor keys (module.tsx SENSORLESS).
});
