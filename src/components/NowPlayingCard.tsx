import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Music2, Pause, Play, Square } from "lucide-react";

interface NowPlayingCardProps {
  track?: string;
  artist?: string;
  album?: string;
  isPlaying?: boolean;
  progress?: number;
  albumArtUrl?: string;
  className?: string;
  /** "card" (default) or the compact single-line "bar". */
  variant?: "card" | "bar";
}

export function NowPlayingCard({
  track = "Nothing playing",
  artist = "—",
  album,
  isPlaying = false,
  progress = 0,
  albumArtUrl,
  className,
  variant = "card",
}: NowPlayingCardProps) {
  if (variant === "bar") {
    return (
      <div className="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-accent-foreground">
        {isPlaying ? (
          <Play className="h-5 w-5 shrink-0 fill-current" />
        ) : (
          <Pause className="h-5 w-5 shrink-0 fill-current" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight">
            {track}
          </div>
        </div>
        <span className="text-xs tabular-nums opacity-70">00:00</span>
        <Square className="h-3.5 w-3.5 shrink-0" />
      </div>
    );
  }
  return (
    <Card
      className={cn(
        "bg-card border-border overflow-hidden",
        className
      )}
    >
      <CardContent className="p-0">
        <div className="flex gap-4 p-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
            {albumArtUrl ? (
              <img
                src={albumArtUrl}
                alt="Album art"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/60">
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

            <h3 className="truncate text-base font-semibold leading-tight text-foreground">
              {track}
            </h3>
            <p className="truncate text-sm text-muted-foreground">{artist}</p>
            {album && (
              <p className="truncate text-xs text-muted-foreground">{album}</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="h-1 w-full overflow-hidden rounded-full bg-secondary">
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
