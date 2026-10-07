import { NowPlayingCard } from "@/components/NowPlayingCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isImageUrl } from "@/lib/image";
import { entry, liveText } from "@/lib/sensors";
import type { DashboardModule } from "./types";

const P = "plugins.media-plugin.";
const C = "media";

/**
 * Media module — now-playing from any media source (Media plugin v1.3.1).
 * Cover art and the playback status icon are image URLs served by the
 * plugin's own local image server.
 *
 * playback-state: 0 = idle, 1 = paused/no track, 2 = playing.
 */
export const mediaModule: DashboardModule = {
  id: "media",
  title: "Media",
  matches: (key) => key.startsWith(P),
  render: (sensors) => {
    const track = liveText(entry(sensors, P, C, "current-track"));
    const artist = liveText(entry(sensors, P, C, "artist"));
    const album = liveText(entry(sensors, P, C, "album"));
    const sourceApp = liveText(entry(sensors, P, C, "source-app"));
    const cover = liveText(entry(sensors, P, C, "cover-art"));
    const statusIcon = liveText(entry(sensors, P, C, "status-image"));
    const progress = entry(sensors, P, C, "track-progress")?.value;
    const elapsed = liveText(entry(sensors, P, C, "elapsed-time"));
    const remaining = liveText(entry(sensors, P, C, "remaining-time"));
    const playback = entry(sensors, P, C, "playback-state")?.value;

    if (!track && !cover) return null;

    const coverUrl = cover && isImageUrl(cover, "cover-art") ? cover : undefined;
    const statusUrl =
      statusIcon && isImageUrl(statusIcon, "status-image") ? statusIcon : undefined;
    const isPlaying = playback === 2;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <NowPlayingCard
          track={track}
          artist={artist}
          album={album}
          albumArtUrl={coverUrl}
          progress={progress ?? 0}
          isPlaying={isPlaying}
          className="md:col-span-2"
        />

        {(sourceApp || elapsed || statusUrl) && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Playback Details
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                {sourceApp && (
                  <div className="text-sm font-medium text-foreground/85">{sourceApp}</div>
                )}
                {(elapsed || remaining) && (
                  <div className="text-xs text-muted-foreground">
                    {elapsed ?? "00:00"} / {remaining ?? "--:--"}
                  </div>
                )}
              </div>
              {statusUrl && (
                <img
                  src={statusUrl}
                  alt="Playback status"
                  className="h-10 w-10 object-contain"
                  loading="lazy"
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  },
};
