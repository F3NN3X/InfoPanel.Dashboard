// Steam Friends: friends by status, in-game first. What the registry needs; the component is its own chunk.
import type { ModuleSettings, PaletteRole } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { steamFriendsIsland } from "../island-sources";
import { boolOf, boolSetting, colorSetting, colorsOf, enumSetting, oneOf, viewSetting, type ColorEntry } from "../shared/settings-kit";
import { meta } from "./meta";
import type { FriendStatus, SteamFriendsProps } from "./SteamFriends";

/** The friend statuses' colours follow the theme: in-game Series 1, online OK, away Warning, busy Critical, offline Series 2. */
const FRIEND_COLOR_ENTRIES: (ColorEntry & { role: PaletteRole })[] = (
  [
    ["ingame", "In-game", "s1"],
    ["online", "Online", "ok"],
    ["away", "Away", "warn"],
    ["busy", "Busy", "crit"],
    ["offline", "Offline", "s2"],
  ] satisfies [FriendStatus, string, PaletteRole][]
).map(([entry, label, role]) => ({ entry, key: `${entry}Color`, label, role }));

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: BOTH },
  settings: [
    viewSetting(meta, { group: "Friends" }),
    boolSetting("ingameOnly", "In-game only", false, { group: "Friends" }),
    boolSetting("showTime", "Last online", true, { group: "Friends" }),
    boolSetting("showCounts", "Counts row", false, { group: "Friends" }),
    ...FRIEND_COLOR_ENTRIES.map((c) => colorSetting(c.key, c.label, { role: c.role, more: false })),
    enumSetting("sort", "Sort", "status", [{ value: "status", label: "Status (in-game first)" }, { value: "name", label: "Name" }, { value: "plugin", label: "Plugin order" }], { group: "Sorting", tab: "behaviour" }),
  ],
  island: steamFriendsIsland,
  render: {
    load: () => import("./SteamFriends"),
    toProps: (s: ModuleSettings): Partial<SteamFriendsProps> => ({
      view: oneOf(s.view, ["list", "table"]),
      sort: oneOf(s.sort, ["status", "name", "plugin"]),
      ingameOnly: boolOf(s.ingameOnly),
      showTime: boolOf(s.showTime),
      showCounts: boolOf(s.showCounts),
      colors: colorsOf(s, FRIEND_COLOR_ENTRIES),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
