// Audio Fader: one channel's fader. What the registry needs; the component is its own chunk.
// It reads and writes the server's audio control (`src/lib/audio-control.ts`), not sensor data.
import { defineWidget, NONE } from "../define";
import { audioPick, faderOf, faderSetting, mixSetting } from "../shared/audio-settings";
import { stringOf, textSetting } from "../shared/settings-kit";
import type { AudioFaderProps } from "./AudioFader";
import { meta } from "./meta";

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: NONE },
  settings: [
    audioPick("channel", "Channel", { group: "Channel" }),
    mixSetting((v) => String(v.channel ?? "").startsWith("wl:")),
    textSetting("name", "Name", "", { group: "Channel", tab: "show" }),
    faderSetting(),
  ],
  render: {
    load: () => import("./AudioFader"),
    toProps: (s): Pick<AudioFaderProps, "channel" | "mix" | "name" | "fader"> => ({
      channel: stringOf(s.channel),
      mix: stringOf(s.mix),
      name: stringOf(s.name),
      fader: faderOf(s.fader),
    }),
  },
});
