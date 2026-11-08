// Achievements: achievement progress for the current game. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { achievementsIsland } from "../island/gaming";
import { enumSetting, oneOf } from "../shared/settings-kit";
import type { AchievementsProps } from "./Achievements";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it.
  inspector: { header: "yes", compact: CARD },
  settings: [enumSetting("display", "Progress display", "ring", [{ value: "ring", label: "Ring" }, { value: "pips", label: "Pips" }], { group: "Progress" })],
  island: achievementsIsland,
  render: {
    load: () => import("./Achievements"),
    toProps: (s: ModuleSettings): Partial<AchievementsProps> => ({ display: oneOf(s.display, ["ring", "pips"]) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
