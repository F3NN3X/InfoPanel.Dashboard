// Game News: headlines for your games. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { steamNewsIsland } from "../island/gaming";
import { numberOf, numberSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { SteamNewsProps } from "./SteamNews";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [numberSetting("lines", "Title lines", 2, { min: 1, max: 4, step: 1, group: "Headlines" })],
  island: steamNewsIsland,
  render: {
    load: () => import("./SteamNews"),
    toProps: (s: ModuleSettings): Partial<SteamNewsProps> => ({ lines: numberOf(s.lines) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
