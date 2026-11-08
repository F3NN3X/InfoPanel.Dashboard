// Steam Library: games owned and recent playtime. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { CARD, defineWidget } from "../define";
import { enumSetting } from "../shared/settings-kit";
import { meta } from "./meta";
import type { SteamLibraryProps } from "./SteamLibrary";

export default defineWidget({
  meta,
  // A summary card; the dense view falls back to it.
  inspector: { header: "yes", compact: CARD },
  settings: [
    enumSetting("showNews", "News list", "auto", [{ value: "auto", label: "Auto (large only)" }, { value: "on", label: "On" }, { value: "off", label: "Off" }], { group: "News list" }),
  ],
  render: {
    load: () => import("./SteamLibrary"),
    toProps: (s: ModuleSettings): Partial<SteamLibraryProps> => ({ showNews: s.showNews === "on" || s.showNews === true ? true : s.showNews === "off" || s.showNews === false ? false : undefined }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
