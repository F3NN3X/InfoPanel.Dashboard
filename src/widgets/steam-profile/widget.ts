// Steam Profile: avatar, status and friends online. What the registry needs; the component is its own chunk.
import { CARD, defineWidget } from "../define";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it.
  inspector: { header: "yes", compact: CARD },
  // No own settings: Data shows where the profile comes from (read-only), so the tab is not empty.
  settings: [{ key: "account", label: "Steam API", type: "status", default: "", sourcePlugin: "plugins.InfoPanel.SteamAPI.", group: "Account", tab: "data" }],
  render: {
    load: () => import("./SteamProfile"),
    toProps: () => ({}),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
