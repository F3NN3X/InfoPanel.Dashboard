import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Music2, Pause, Play } from "lucide-react";

interface NowPlayingCardProps {
  track?: string;
  artist?: string;
  album?: string;
  isPlaying?: boolean;
  progress?: number;
  albumArtUrl?: string;
  className?: string;
}

export function NowPlayingCard({
  track = "Nothing playing",
  artist = "—",
  album,
  isPlaying = false,
  progress = 0,
  albumArtUrl,
  className,
}: NowPlayingCardProps) {
  return (
    <Card
      className={cn(
        "bg-zinc-950/80 border-zinc-800 overflow-hidden",
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-zinc-900">
            {albumArtUrl ? (
              <img
                src={albumArtUrl}
                alt="Album art"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <Music2 className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="h-5 gap-1 px-1.5 text-[10px] uppercase tracking-wider"
              >
                {isPlaying ? (
                  <>
                    <Play className="h-2.5 w-2.5 fill-current" />
                    Playing
                  </>
                ) : (
                  <>
                    <Pause className="h-2.5 w-2.5 fill-current" />
                    Paused
                  </>
                )}
              </Badge>
            </div>

            <h3 className="truncate text-base font-semibold leading-tight text-zinc-50">
              {track}
            </h3>
            <p className="truncate text-sm text-zinc-400">{artist}</p>
            {album && (
              <p className="truncate text-xs text-zinc-500">{album}</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
