// Stream Control: the OBS control tile. What the registry needs; the component is its own chunk.
// It reads the server's OBS connection (`useExtras().obs`) and acts through `src/lib/obs-control.ts`, not sensor data.
import { BOTH, defineWidget } from "../define";
import { boolOf, boolSetting } from "../shared/settings-kit";
import type { StreamControlProps } from "./StreamControl";
import { meta } from "./meta";

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: BOTH },
  settings: [
    boolSetting("showMic", "Show mic", true, { group: "Tiles", hint: "Needs a mic input under Settings › Connections" }),
    boolSetting("showReplay", "Show replay", true, { group: "Tiles", hint: "Needs the replay buffer turned on in OBS" }),
  ],
  render: {
    load: () => import("./StreamControl"),
    toProps: (s): Pick<StreamControlProps, "showMic" | "showReplay"> => ({ showMic: boolOf(s.showMic), showReplay: boolOf(s.showReplay) }),
  },
});
