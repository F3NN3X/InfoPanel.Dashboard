// Now Playing: track, artist and cover art, with an optional visualiser. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { defineWidget } from "../define";
import { nowPlayingIsland } from "../island-sources";
import { flowOfSettings, pickedDevicesOf } from "../registry/audio-settings";
import { boolOf, pick, stringOf } from "../registry/settings-kit";
import { colorModeOf } from "../registry/viz-settings";
import type { NowPlayingProps } from "./NowPlaying";
import { meta } from "./meta";
import { NOW_PLAYING_SETTINGS, sharedPropsOf, vizStyleOf } from "./settings";

/**
 * Where the template reads the keys it no longer offers: the saved values under the resolved ones, with
 * `vizGap` / `vizShape` only when saved (their defaults must not hide a saved legacy bar width or radius).
 */
function hiddenOf(s: ModuleSettings, saved: ModuleSettings | undefined): ModuleSettings {
  const out: ModuleSettings = { ...saved, ...s };
  for (const k of ["vizGap", "vizShape"]) {
    if (saved?.[k] === undefined) delete out[k];
    else out[k] = saved[k];
  }
  return out;
}

export default defineWidget({
  meta,
  // A summary card and a dense view of its own.
  inspector: { header: "yes", compact: { card: true, dense: true } },
  settings: NOW_PLAYING_SETTINGS,
  island: nowPlayingIsland,
  render: {
    load: () => import("./NowPlaying"),
    // the visualiser's levels: read, not owned
    reads: ["plugins.audio-level-meter."],
    // The keys no row offers (`vizMinPx`, `vizScrollAs`; before config v8 the old engines' keys) are read from the saved values.
    toProps: (s: ModuleSettings, saved?: ModuleSettings): Partial<NowPlayingProps> => {
      const hidden = hiddenOf(s, saved);
      const shared = sharedPropsOf(s, hidden);
      return {
        ...pick<NowPlayingProps>(["source", "showArt", "progress", "showTimeline"])(s),
        ...shared,
        vizLook: { ...shared.vizLook, colorMode: colorModeOf(s, saved), peaks: boolOf(s.vizPeaks) },
        vizMode: vizStyleOf(hidden),
        // unset / Auto = "" (the loudest live device); undefined would pin default-audio
        vizDevices: pickedDevicesOf(hidden, "vizDevices"),
        vizFlow: flowOfSettings(s),
        vizRamp: stringOf(s.vizColor1) ?? stringOf(hidden.vizRamp),
      };
    },
  },
  // settings-migrate.ts: config v8 renamed the old Spotify / Media widgets' keys (now-playing/settings.ts reads both).
  migrations: "central",
  // src/widgets/__fixtures__/snapshot.json; widget-qa needs no demo settings for it.
  sample: "central",
});
