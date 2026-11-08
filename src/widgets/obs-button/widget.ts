// OBS Button: a one-tap scene switch, mic mute or replay save. What the registry needs; the component is its own chunk.
// It reads the server's OBS connection (`useExtras().obs`) and acts through `src/lib/obs-control.ts`, not sensor data.
import { defineWidget, NONE } from "../define";
import { enumSetting, oneOf, stringOf, textSetting } from "../shared/settings-kit";
import type { ObsButtonProps } from "./ObsButton";
import { meta } from "./meta";

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: NONE },
  settings: [
    enumSetting(
      "action",
      "Action",
      "scene",
      [
        { value: "scene", label: "Switch scene" },
        { value: "mic", label: "Mute the mic" },
        { value: "replay", label: "Save replay" },
      ],
      { group: "Action", tab: "data" }
    ),
    { key: "scene", label: "Scene", type: "select", default: "", optionsFrom: "obs-scenes", tab: "data", group: "Action", visibleIf: (v) => v.action === undefined || v.action === "scene" },
    textSetting("name", "Name", "", { group: "Label", tab: "show" }),
    textSetting("symbol", "Symbol (Material Symbols name)", "", { group: "Label", tab: "show", more: true }),
  ],
  render: {
    load: () => import("./ObsButton"),
    toProps: (s): Pick<ObsButtonProps, "action" | "scene" | "name" | "symbol"> => ({
      action: oneOf(s.action, ["scene", "mic", "replay"] as const),
      scene: stringOf(s.scene),
      name: stringOf(s.name),
      symbol: stringOf(s.symbol),
    }),
  },
});
