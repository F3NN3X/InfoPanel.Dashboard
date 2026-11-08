// Current Game: session and total playtime. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { enumSetting, numberOf, numberSetting, oneOf } from "../shared/settings-kit";
import { meta } from "./meta";
import type { SteamGameProps } from "./SteamGame";

export default defineWidget({
  meta,
  // No header; a summary card, the dense view falls back to it.
  inspector: { header: "none", compact: CARD },
  settings: [
    enumSetting("art", "Artwork", "banner", [{ value: "banner", label: "Banner" }, { value: "grid", label: "Grid" }, { value: "none", label: "None" }], { group: "Artwork" }),
    numberSetting("scrim", "Scrim darkness", 0.55, { min: 0, max: 1, step: 0.05, group: "Artwork" }),
  ],
  render: {
    load: () => import("./SteamGame"),
    toProps: (s: ModuleSettings): Partial<SteamGameProps> => ({ art: oneOf(s.art, ["banner", "grid", "none"]), scrim: numberOf(s.scrim) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
