import {
  ModernNowPlaying,
  type ModernStyle,
  type ModernVariant,
} from "@/components/ModernNowPlaying";
import { isImageUrl } from "@/lib/image";
import { entry, liveText } from "@/lib/sensors";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
  type SensorMap,
} from "./types";

/**
 * Modern now-playing widgets — the adaptive redesign of Now Playing / Media.
 *
 * One component (`ModernNowPlaying`) renders four layouts and picks the one
 * that fits the zone's measured size (card / standard / compact / simple),
 * with a cover-art-tinted surface. Two modules register it:
 *
 * - `spotifymodern` — the spotify-plugin / direct-push keys
 * - `mediamodern`   — the media-plugin keys (adds elapsed/remaining times)
 *
 * The classic `spotify` / `media` modules are left untouched.
 */

const MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "variant",
    label: "Layout",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto (fit to zone)" },
      { value: "card", label: "Card" },
      { value: "standard", label: "Standard" },
      { value: "compact", label: "Compact bar" },
      { value: "simple", label: "Simple" },
    ],
  },
  {
    key: "style",
    label: "Surface",
    type: "select",
    default: "glass",
    options: [
      { value: "glass", label: "Glass" },
      { value: "matte-light", label: "Matte (light)" },
      { value: "matte-dark", label: "Matte (dark)" },
    ],
  },
  { key: "tint", label: "Tint from cover art", type: "boolean", default: true },
  { key: "showTimes", label: "Times", type: "boolean", default: true },
  { key: "showProgress", label: "Progress", type: "boolean", default: true },
];

function modernProps(mod: DashboardModule, s?: ModuleSettings) {
  const cfg = effectiveSettings(mod, s);
  return {
    variant: String(cfg.variant) as ModernVariant | "auto",
    style: String(cfg.style) as ModernStyle,
    tint: Boolean(cfg.tint),
    showTimes: Boolean(cfg.showTimes),
    showProgress: Boolean(cfg.showProgress),
  };
}

function resolve(sensors: SensorMap, primary: string, fallback: string) {
  return sensors[primary] ?? sensors[fallback];
}

export const spotifyModernModule: DashboardModule = {
  id: "spotifymodern",
  title: "Now Playing (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) =>
    key.startsWith("spotify.") || key.startsWith("plugins.spotify-plugin."),
  settings: MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = modernProps(spotifyModernModule, s);
    const track = resolve(
      sensors,
      "spotify.track",
      "plugins.spotify-plugin.spotify.current-track"
    )?.text;
    const artist = resolve(
      sensors,
      "spotify.artist",
      "plugins.spotify-plugin.spotify.artist"
    )?.text;
    const art = resolve(
      sensors,
      "spotify.art",
      "plugins.spotify-plugin.spotify.cover-art"
    )?.text;
    const progress =
      resolve(
        sensors,
        "spotify.progress",
        "plugins.spotify-plugin.spotify.track-progress"
      )?.value ?? 0;
    const playback =
      resolve(
        sensors,
        "spotify.playing",
        "plugins.spotify-plugin.spotify.playback-state"
      )?.value;

    return (
      <ModernNowPlaying
        track={track}
        artist={artist}
        artUrl={art && isImageUrl(art, "art") ? art : undefined}
        progress={progress}
        isPlaying={playback === 2}
        {...cfg}
      />
    );
  },
};

const P = "plugins.media-plugin.";
const C = "media";

export const mediaModernModule: DashboardModule = {
  id: "mediamodern",
  title: "Media (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  settings: MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = modernProps(mediaModernModule, s);
    const track = liveText(entry(sensors, P, C, "current-track"));
    const artist = liveText(entry(sensors, P, C, "artist"));
    const cover = liveText(entry(sensors, P, C, "cover-art"));
    const progress = entry(sensors, P, C, "track-progress")?.value ?? 0;
    const elapsed = liveText(entry(sensors, P, C, "elapsed-time"));
    const remaining = liveText(entry(sensors, P, C, "remaining-time"));
    const playback = entry(sensors, P, C, "playback-state")?.value;

    return (
      <ModernNowPlaying
        track={track}
        artist={artist}
        artUrl={cover && isImageUrl(cover, "cover-art") ? cover : undefined}
        progress={progress}
        elapsed={elapsed}
        remaining={remaining}
        isPlaying={playback === 2}
        {...cfg}
      />
    );
  },
};
