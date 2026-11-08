// Stream Mixer: touch faders for Windows audio or Wave Link. What the registry needs; the component is its own chunk.
// It reads and writes the server's audio control (`src/lib/audio-control.ts`), not sensor data.
import { BOTH, defineWidget } from "../define";
import { audioPick, faderOf, faderSetting, mixerLookOf, mixerViewSettings, mixSetting } from "../shared/audio-settings";
import { enumSetting, oneOf, splitKeys, stringOf, textSetting, viewOnly } from "../shared/settings-kit";
import type { StreamMixerProps } from "./StreamMixer";
import { overridesOf } from "./channels";
import { meta } from "./meta";

const LINES = "One per line, as channel id = text";

const sourceOf = (v: unknown) => oneOf(v, ["windows", "wavelink"] as const);

export default defineWidget({
  meta,
  inspector: { header: "yes", compact: BOTH },
  settings: [
    enumSetting("source", "Control", "windows", [{ value: "windows", label: "Windows" }, { value: "wavelink", label: "Wave Link" }], { group: "Source", tab: "data" }),
    mixSetting((v) => v.source === "wavelink"),
    audioPick("channels", "Channels (none = all)", { group: "Channels", multiple: true }),
    textSetting("labels", "Names", "", { group: "Channels", multiline: true, tab: "show", hint: `${LINES}, e.g. app:discord.exe = Discord` }),
    textSetting("subs", "Status lines", "", { group: "Channels", multiline: true, tab: "show", more: true, hint: LINES }),
    textSetting("icons", "Icons", "", { group: "Channels", multiline: true, tab: "show", more: true, hint: `${LINES}, with a Material Symbols name` }),
    // the LED / bar fader is the rows view's; the audiocn views have their own fader rows
    viewOnly(meta, "rows")(faderSetting()),
    ...mixerViewSettings(meta, { orientationKey: "orientation", writable: true }),
  ],
  render: {
    load: () => import("./StreamMixer"),
    toProps: (s): Pick<StreamMixerProps, "source" | "mix" | "channels" | "labels" | "subs" | "icons" | "fader" | "mixerLook"> => ({
      source: sourceOf(s.source),
      mix: stringOf(s.mix),
      channels: splitKeys(s.channels),
      labels: overridesOf(s.labels),
      subs: overridesOf(s.subs),
      icons: overridesOf(s.icons),
      fader: faderOf(s.fader),
      mixerLook: mixerLookOf(s, "orientation"),
    }),
  },
});
