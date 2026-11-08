// Audio Button: a one-tap mute or output switch. What the registry needs; the component is its own chunk.
// It writes through the server's audio control (`src/lib/audio-control.ts`), not sensor data.
import { defineWidget, NONE } from "../define";
import { audioPick, mixSetting } from "../shared/audio-settings";
import { enumSetting, oneOf, stringOf, textSetting } from "../shared/settings-kit";
import type { AudioButtonProps } from "./AudioButton";
import { meta } from "./meta";

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: NONE },
  settings: [
    enumSetting("action", "Action", "mute", [{ value: "mute", label: "Mute a channel" }, { value: "output", label: "Switch output" }], { group: "Action", tab: "data" }),
    audioPick("channel", "Channel", { group: "Action", visibleIf: (v) => v.action !== "output" }),
    mixSetting((v) => v.action !== "output" && String(v.channel ?? "").startsWith("wl:")),
    audioPick("device", "Output device", { group: "Action", visibleIf: (v) => v.action === "output" }),
    textSetting("name", "Name", "", { group: "Label", tab: "show" }),
    textSetting("symbol", "Symbol (Material Symbols name)", "", { group: "Label", tab: "show", more: true }),
  ],
  render: {
    load: () => import("./AudioButton"),
    toProps: (s): Pick<AudioButtonProps, "action" | "channel" | "mix" | "device" | "name" | "symbol"> => ({
      action: oneOf(s.action, ["mute", "output"] as const),
      channel: stringOf(s.channel),
      mix: stringOf(s.mix),
      device: stringOf(s.device),
      name: stringOf(s.name),
      symbol: stringOf(s.symbol),
    }),
  },
});
