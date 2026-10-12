import NowPlaying, { meta as nowPlaying } from "@/widgets/NowPlaying";
import { AUDIO_LEVEL, legacyPropsOf, MEDIA_SETTINGS, PLAYER_LAYOUT } from "@/widgets/NowPlaying/settings";
import { templateModule } from "@/widgets/module";
import { entry } from "@/lib/sensors";
import { IDLE_SETTING } from "./standard-settings";
import type { DashboardModule, SensorMap } from "./types";

/**
 * The legacy now-playing ids, rendered by the NowPlaying template (`src/widgets/NowPlaying.tsx`)
 * with a fixed source. Both keep their stored settings; the template supersedes them in the Library.
 *
 * - `spotifymodern` — the spotify-plugin / direct-push keys
 * - `mediamodern`   — the media-plugin keys
 */

function resolve(sensors: SensorMap, primary: string, fallback: string) {
  return sensors[primary] ?? sensors[fallback];
}

function legacyMedia(id: string, title: string, source: "spotify" | "media", prefixes: string[], isIdle: DashboardModule["isIdle"]): DashboardModule {
  return templateModule({
    meta: nowPlaying,
    Component: NowPlaying,
    settings: [IDLE_SETTING, ...MEDIA_SETTINGS, PLAYER_LAYOUT],
    toProps: (s) => legacyPropsOf(s, source),
    isIdle,
    prefixes: [AUDIO_LEVEL],
    alias: { id, title, minCols: 2, minRows: 1, prefixes },
  });
}

export const spotifyModernModule: DashboardModule = legacyMedia(
  "spotifymodern",
  "Spotify (modern)",
  "spotify",
  ["spotify.", "plugins.spotify-plugin."],
  // Idle = not playing (paused or stopped).
  (sensors) => resolve(sensors, "spotify.playing", "plugins.spotify-plugin.spotify.playback-state")?.value !== 2
);

const P = "plugins.media-plugin.";
const C = "media";

export const mediaModernModule: DashboardModule = legacyMedia(
  "mediamodern",
  "Media (modern)",
  "media",
  [P],
  // Idle = not playing (paused or stopped).
  (sensors) => entry(sensors, P, C, "playback-state")?.value !== 2
);
