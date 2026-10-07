import { NowPlayingCard } from "@/components/NowPlayingCard";
import type { DashboardModule } from "./types";

/**
 * Spotify module — the now-playing state.
 *
 * Consumes the plugin's direct pushes (`spotify.*`) when present, falling
 * back to the main process export (`plugins.spotify-plugin.spotify.*`).
 */
export const spotifyModule: DashboardModule = {
  id: "spotify",
  title: "Now Playing",
  matches: (key) =>
    key.startsWith("spotify.") || key.startsWith("plugins.spotify-plugin."),
  render: (sensors) => {
    const track = resolve(sensors, "spotify.track", "plugins.spotify-plugin.spotify.current-track")?.text;
    const artist = resolve(sensors, "spotify.artist", "plugins.spotify-plugin.spotify.artist")?.text;
    const album = resolve(sensors, "spotify.album", "plugins.spotify-plugin.spotify.album")?.text;
    const art = resolve(sensors, "spotify.art", "plugins.spotify-plugin.spotify.cover-art")?.text;
    const progress = resolve(sensors, "spotify.progress", "plugins.spotify-plugin.spotify.track-progress")?.value;
    const playback = resolve(sensors, "spotify.playing", "plugins.spotify-plugin.spotify.playback-state")?.value;

    if (track === undefined && artist === undefined && progress === undefined) {
      return null;
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <NowPlayingCard
          track={track}
          artist={artist}
          album={album}
          albumArtUrl={art || undefined}
          progress={progress ?? 0}
          isPlaying={playback === 2}
        />
      </div>
    );
  },
};

function resolve(sensors: Record<string, import("@/hooks/useSensors").SensorValue>, primary: string, fallback: string) {
  return sensors[primary] ?? sensors[fallback];
}
