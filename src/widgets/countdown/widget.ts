// Countdown: days until an event, or since it. What the registry needs; the component is its own chunk.
import { isDate, isTime } from "@/lib/countdown";
import { clockOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { countdownIsland } from "../island/countdown";
import { boolOf, boolSetting, dateSetting, enumSetting, formatSetting, oneOf, stringOf, textSetting, timeSetting, viewSetting } from "../shared/settings-kit";
import type { CountdownProps } from "./Countdown";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own; the clock format.
  inspector: { header: "yes", compact: BOTH, fmt: ["clock"] },
  settings: [
    viewSetting(meta, { group: "Event" }),
    textSetting("eventName", "Event name", "", { group: "Event", hint: "Empty = no title line" }),
    dateSetting("date", "Date", "", { group: "Event", tab: "data" }),
    timeSetting("time", "Time of day", "", { group: "Event", tab: "data", hint: "Empty = an all-day event" }),
    enumSetting("count", "Count", "auto", [{ value: "auto", label: "Auto" }, { value: "until", label: "Until" }, { value: "since", label: "Since" }], { group: "Counting", tab: "data", hint: "Auto counts up an hour after the start (the rest of the day when all-day)" }),
    enumSetting("breakdown", "Breakdown", "auto", [{ value: "auto", label: "Auto" }, { value: "days", label: "Days" }, { value: "years", label: "Years" }, { value: "live", label: "Live" }], { group: "Counting", tab: "data", hint: "Live adds seconds" }),
    boolSetting("showDate", "Show the date", true, { group: "Event" }),
    formatSetting("clock"),
  ],
  island: countdownIsland,
  render: {
    load: () => import("./Countdown"),
    // A malformed date or time reads as unset.
    toProps: (s: ModuleSettings): Partial<CountdownProps> => ({
      view: oneOf(s.view, ["inline", "tiles", "big"]),
      eventName: stringOf(s.eventName),
      date: isDate(s.date) ? s.date : undefined,
      time: isTime(s.time) ? s.time : undefined,
      count: oneOf(s.count, ["auto", "until", "since"]),
      breakdown: oneOf(s.breakdown, ["auto", "days", "years", "live"]),
      showDate: boolOf(s.showDate),
      clock: clockOf(s),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with the
  // demo date from widget-qa/demo-settings.ts.
});
