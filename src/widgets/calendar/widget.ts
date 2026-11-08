// Calendar: the month with today marked. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { enumSetting, numberOf, oneOf } from "../shared/settings-kit";
import type { CalendarProps } from "./Calendar";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // No header; a summary card.
  inspector: { header: "none", compact: CARD },
  settings: [enumSetting("weekStart", "Week starts on", "1", [{ value: "1", label: "Monday" }, { value: "0", label: "Sunday" }], { group: "Week" })],
  render: {
    load: () => import("./Calendar"),
    toProps: (s: ModuleSettings): Partial<CalendarProps> => ({ weekStart: numberOf(oneOf(String(s.weekStart), ["0", "1"])) }),
    // The date comes from the clock plugin, owned by Clock.
    reads: ["plugins.clock-plugin."],
  },
  // Migrations and sample stay central (the default): no migration steps of its own today; the sample is
  // src/widgets/__fixtures__/snapshot.json, with no widget-qa demo settings. It draws without sensor keys (module.tsx
  // SENSORLESS).
});
