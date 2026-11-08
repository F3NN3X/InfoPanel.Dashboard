// On-Air Beacon: live, recording or off air, read from OBS. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { NONE, defineWidget } from "../define";
import { boolOf, boolSetting, colorSetting, stringOf } from "../shared/settings-kit";
import type { OnAirBeaconProps } from "./OnAirBeacon";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // No summary card and no dense view.
  inspector: { header: "yes", compact: NONE },
  settings: [
    boolSetting("showElapsed", "Elapsed time", true, { group: "Display", hint: "Counted from when the dashboard first sees the state; OBS does not report how long it has run" }),
    boolSetting("seconds", "Count seconds", false, { group: "Display", hint: "Ticks every second while on air; off counts minutes", visibleIf: (v) => v.showElapsed !== false }),
    colorSetting("liveColor", "Live", { role: "crit", more: false }),
    colorSetting("recColor", "Recording", { role: "warn", more: false }),
  ],
  render: {
    load: () => import("./OnAirBeacon"),
    toProps: (s: ModuleSettings): Partial<OnAirBeaconProps> => ({ showElapsed: boolOf(s.showElapsed), seconds: boolOf(s.seconds), liveColor: stringOf(s.liveColor), recColor: stringOf(s.recColor) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings. It draws without sensor keys (module.tsx SENSORLESS).
});
