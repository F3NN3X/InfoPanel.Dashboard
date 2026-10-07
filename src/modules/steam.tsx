import { SmartValue } from "@/components/SmartValue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, User, Users } from "lucide-react";
import { isImageUrl } from "@/lib/image";
import { entry, liveText, liveValue } from "@/lib/sensors";
import type { DashboardModule } from "./types";

const P = "plugins.InfoPanel.SteamAPI.";
const PROFILE = "SteamAPI-Profile";
const SESSION = "SteamAPI-Session";
const LIBRARY = "SteamAPI-Library";
const ACHIEVEMENTS = "SteamAPI-Achievements";
const SOCIAL = "SteamAPI-Social";
const NEWS = "SteamAPI-News";

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value?: string | number;
  hint?: string;
}) {
  return (
    <div>
      <div className="text-2xl font-bold tracking-tight text-foreground">
        {value !== undefined && value !== "" ? value : "—"}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {hint && <div className="mt-0.5 truncate text-xs text-muted-foreground/60" title={hint}>{hint}</div>}
    </div>
  );
}

export const steamModule: DashboardModule = {
  id: "steam",
  title: "Steam",
  matches: (key) => key.startsWith(P),
  render: (sensors) => {
    const name = liveText(entry(sensors, P, PROFILE, "player-name"));
    const status = liveText(entry(sensors, P, PROFILE, "online-status"));
    const level = liveValue(entry(sensors, P, PROFILE, "steam-level"));
    const avatar = liveText(entry(sensors, P, PROFILE, "profile_image_url"));

    const game = liveText(entry(sensors, P, SESSION, "current-game"));
    const playtime = liveValue(entry(sensors, P, SESSION, "current-game-playtime"));
    const sessionTime = liveText(entry(sensors, P, SESSION, "current-session-time"));
    const banner = liveText(entry(sensors, P, PROFILE, "current_game_banner_url"));
    const logo = liveText(entry(sensors, P, PROFILE, "game_logo_url"));

    const totalGames = liveValue(entry(sensors, P, LIBRARY, "total-games"));
    const totalHours = liveValue(entry(sensors, P, LIBRARY, "total-playtime"));
    const recentHours = liveValue(entry(sensors, P, LIBRARY, "recent-playtime"));
    const mostPlayed = liveText(entry(sensors, P, LIBRARY, "most-played-recent"));

    const achPct = liveValue(entry(sensors, P, ACHIEVEMENTS, "current-achievements"));
    const latestAch = liveText(entry(sensors, P, ACHIEVEMENTS, "latest-achievement"));
    const achIcon = liveText(entry(sensors, P, ACHIEVEMENTS, "latest-achievement-icon"));

    const friendsOnline = liveValue(entry(sensors, P, SOCIAL, "friends-online"));
    const totalFriends = liveValue(entry(sensors, P, SOCIAL, "total-friends"));

    const news = liveText(entry(sensors, P, NEWS, "current_game_news_title"));

    if (!name && !game && totalGames === undefined) return null;

    const avatarUrl = avatar && isImageUrl(avatar, "profile_image_url") ? avatar : undefined;
    const gameArt = banner && isImageUrl(banner, "current_game_banner_url")
      ? banner
      : logo && isImageUrl(logo, "game_logo_url")
        ? logo
        : undefined;

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Profile */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <User className="h-3.5 w-3.5" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Steam avatar"
                  className="h-14 w-14 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground/60">
                  <User className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-lg font-semibold text-foreground">
                  {name ?? "Unknown"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {status ?? "Offline"}
                  {level !== undefined ? ` · Level ${Math.round(level)}` : ""}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current game */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Game
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gameArt ? (
              <img
                src={gameArt}
                alt={game ?? "Game"}
                className="mb-3 h-24 w-full rounded-md object-cover"
                loading="lazy"
              />
            ) : null}
            <div className="truncate text-lg font-semibold text-foreground">
              {game ?? "Not playing"}
            </div>
            <div className="text-sm text-muted-foreground">
              {sessionTime ? `Session ${sessionTime}` : "No active session"}
              {playtime !== undefined ? ` · ${Math.round(playtime)}h owned` : ""}
            </div>
          </CardContent>
        </Card>

        {/* Library & social stats */}
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <Trophy className="h-3.5 w-3.5" /> Library & Social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Stat label="Games owned" value={totalGames} />
              <Stat
                label="Total playtime"
                value={totalHours !== undefined ? `${Math.round(totalHours)}h` : undefined}
              />
              <Stat
                label="Played (2w)"
                value={recentHours !== undefined ? `${Math.round(recentHours)}h` : undefined}
                hint={mostPlayed}
              />
              <Stat
                label="Friends online"
                value={
                  friendsOnline !== undefined
                    ? totalFriends !== undefined
                      ? `${friendsOnline}/${totalFriends}`
                      : friendsOnline
                    : undefined
                }
              />
            </div>
            {(achPct !== undefined || latestAch) && (
              <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
                {achIcon && isImageUrl(achIcon, "latest-achievement-icon") && (
                  <img
                    src={achIcon}
                    alt="Achievement"
                    className="h-8 w-8 rounded object-cover"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0">
                  {achPct !== undefined && (
                    <div className="text-sm font-medium text-foreground/85">
                      {Math.round(achPct)}% achievements
                    </div>
                  )}
                  {latestAch && (
                    <div className="truncate text-xs text-muted-foreground" title={latestAch}>
                      Latest: {latestAch}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {news && (
          <Card className="border-border bg-card lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> News
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SmartValue value={news} className="text-sm text-foreground/85" />
            </CardContent>
          </Card>
        )}
      </div>
    );
  },
};
