// What Volume Mixer sends to the Dynamic Island (`src/lib/island/sources.ts`): the Windows default
// device's volume and mute, like the macOS volume pop-up, and the default output switching. `derive`
// is pure; `prev` null is the baseline and raises nothing.
import type { DataSourceDef, SourceNotice } from "@/lib/island/sources";
import type { Data } from "../core/types";
import { get, has, num } from "../core/data";
import { boolSetting } from "../registry/settings-kit";

const DEFAULT = "plugins.volume-plugin.default.";

/** The default device: volume (0-100), mute and name. */
function defaultOf(d: Data): { volume: number; muted: boolean; device: string } | null {
  const volume = num(get(d, `${DEFAULT}volume`));
  if (!Number.isFinite(volume)) return null;
  return { volume, muted: get(d, `${DEFAULT}mute`) === "True", device: get(d, `${DEFAULT}device_friendly_name`) || get(d, `${DEFAULT}friendly_name`) };
}

/** The default device's volume and mute as a level bar; optionally the default output switching. */
export const volumeMixerIsland: DataSourceDef = {
  from: "data",
  hint: "A level bar when the Windows volume changes or mutes",
  defaultOn: false,
  group: "Volume mixer",
  options: [boolSetting("islandDevice", "Output switched", true, { hint: "A notice when the default output device changes" })],
  derive(prev, next, settings) {
    const was = prev && defaultOf(prev);
    const now = defaultOf(next);
    if (!was || !now) return {};
    const notices: SourceNotice[] = [];
    if (settings.islandDevice !== false && has(now.device) && has(was.device) && now.device !== was.device) {
      notices.push({ id: "device", severity: "info", title: now.device, body: "Output device", ttl: 3000 });
    } else if (now.volume !== was.volume || now.muted !== was.muted) {
      // One notice, kept open while the volume moves.
      notices.push({
        id: "volume",
        severity: "info",
        title: now.muted ? "Muted" : `Volume ${Math.round(now.volume)}%`,
        ...(has(now.device) ? { body: now.device } : {}),
        progress: now.muted ? 0 : Math.max(0, Math.min(1, now.volume / 100)),
        ttl: 1500,
        refresh: true,
      });
    }
    return { notices };
  },
};
