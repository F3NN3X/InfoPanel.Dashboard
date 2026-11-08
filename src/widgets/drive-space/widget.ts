// Drive Space: used and free space per drive. What the registry needs; the component is its own chunk.
import { deviceOf, thresholdsOf } from "@/modules/setting-readers";
import type { ModuleSettings } from "@/modules/types";
import { BOTH, defineWidget } from "../define";
import { driveSpaceIsland } from "../island/hardware";
import { boolOf, boolSetting, deviceSetting, enumSetting, oneOf, stringOf, textSetting, thresholdSetting, viewOnly, viewSetting } from "../shared/settings-kit";
import type { DriveSpaceProps } from "./DriveSpace";
import { meta } from "./meta";

export default defineWidget({
  meta,
  // A summary card and a dense view of its own; the full-drive thresholds.
  inspector: { header: "yes", compact: BOTH, thr: ["full"] },
  settings: [
    viewSetting(meta, { group: "Drive" }),
    deviceSetting("Drive", "drive", { group: "Drive", hint: "Pin one volume; Auto lists all" }),
    enumSetting("sort", "Sort", "usage", [{ value: "usage", label: "By usage" }, { value: "name", label: "By name" }], { group: "Sorting", tab: "behaviour" }),
    // Segments and Bars always colour by fullness.
    viewOnly(meta, "list")(boolSetting("neutral", "Neutral below thresholds", false, { tab: "style", perWidget: true })),
    thresholdSetting("full"),
    textSetting("icons", "Drive icons", "", { group: "Drive", driveIcons: true, keywords: ["emblem", "image", "logo"], hint: "Your own image or an icon for each drive" }),
  ],
  island: driveSpaceIsland,
  render: {
    load: () => import("./DriveSpace"),
    toProps: (s: ModuleSettings): Partial<DriveSpaceProps> => ({ view: oneOf(s.view, ["list", "segments", "bars"]), drive: deviceOf(s, "drive"), sort: oneOf(s.sort, ["usage", "name"]), ...thresholdsOf(s, "full", ["warn", "crit"]), neutral: boolOf(s.neutral), icons: stringOf(s.icons) }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
