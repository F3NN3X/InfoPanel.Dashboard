import { ModernSteam } from "@/components/ModernSteam";
import { imageUrl } from "@/lib/image";
import { entry, liveText, liveValue } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
} from "./types";

/**
 * Modern Steam widget — the adaptive redesign of the classic Steam module
 * (the InfoPanel SteamAPI plugin's profile / session / library / social
 * containers). The game banner is the widget background with the
 * transparent game logo overlaid on top. One component (`ModernSteam`)
 * picks card / standard / compact / simple from the zone's measured size.
 */

const P = "plugins.InfoPanel.SteamAPI.";
const PROFILE = "SteamAPI-Profile";
const SESSION = "SteamAPI-Session";
const LIBRARY = "SteamAPI-Library";
const ACHIEVEMENTS = "SteamAPI-Achievements";
const SOCIAL = "SteamAPI-Social";
const NEWS = "SteamAPI-News";

const STEAM_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  {
    key: "dimBanner",
    label: "Dim banner for text",
    type: "boolean",
    default: true,
  },
  { key: "showStats", label: "Stats", type: "boolean", default: true },
  { key: "showNews", label: "News line", type: "boolean", default: true },
];

function modernProps(mod: DashboardModule, s?: ModuleSettings) {
  const cfg = effectiveSettings(mod, s);
  return {
    layout: String(cfg.layout) as "auto" | "card" | "standard" | "compact" | "simple",
    surfaceStyle: String(cfg.surface) as "glass" | "matte-light" | "matte-dark",
    dimBanner: Boolean(cfg.dimBanner),
    showStats: Boolean(cfg.showStats),
    showNews: Boolean(cfg.showNews),
    chrome: chromeOf(cfg),
  };
}

export const steamModernModule: DashboardModule = {
  id: "steammodern",
  title: "Steam (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: [P],
  settings: STEAM_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = modernProps(steamModernModule, s);
    const name = liveText(entry(sensors, P, PROFILE, "player-name"));
    const status = liveText(entry(sensors, P, PROFILE, "online-status"));
    const level = liveValue(entry(sensors, P, PROFILE, "steam-level"));
    const avatar = liveText(entry(sensors, P, PROFILE, "profile_image_url"));

    const game = liveText(entry(sensors, P, SESSION, "current-game"));
    const playtime = liveValue(entry(sensors, P, SESSION, "current-game-playtime"));
    const sessionTime = liveText(entry(sensors, P, SESSION, "current-session-time"));
    const sessionStart = liveText(entry(sensors, P, SESSION, "session-start-time"));

    const banner = liveText(entry(sensors, P, PROFILE, "current_game_banner_url"));
    const logo = liveText(entry(sensors, P, PROFILE, "game_logo_url"));
    const icon = liveText(entry(sensors, P, PROFILE, "game_icon_url"));

    const totalGames = liveValue(entry(sensors, P, LIBRARY, "total-games"));

    const achPct = liveValue(entry(sensors, P, ACHIEVEMENTS, "current-achievements"));
    const latestAch = liveText(entry(sensors, P, ACHIEVEMENTS, "latest-achievement"));
    const achIcon = liveText(entry(sensors, P, ACHIEVEMENTS, "latest-achievement-icon"));

    const friendsOnline = liveValue(entry(sensors, P, SOCIAL, "friends-online"));
    const totalFriends = liveValue(entry(sensors, P, SOCIAL, "total-friends"));

    const news = liveText(entry(sensors, P, NEWS, "current_game_news_title"));

    if (!name && !game && totalGames === undefined) return null;

    const avatarUrl =
      imageUrl(avatar, "profile_image_url");
    const bannerUrl =
      imageUrl(banner, "current_game_banner_url");
    const logoUrl = imageUrl(logo, "game_logo_url");
    const iconUrl = imageUrl(icon, "game_icon_url");
    const achIconUrl =
      imageUrl(achIcon, "latest-achievement-icon");

    return (
      <ModernSteam
        name={name}
        status={status}
        level={level}
        avatarUrl={avatarUrl}
        game={game}
        playtimeHours={playtime}
        sessionTime={sessionTime}
        sessionStart={sessionStart}
        bannerUrl={bannerUrl}
        logoUrl={logoUrl}
        iconUrl={iconUrl}
        totalGames={totalGames}
        achPct={achPct}
        latestAch={latestAch}
        achIconUrl={achIconUrl}
        friendsOnline={friendsOnline}
        totalFriends={totalFriends}
        news={news}
        {...cfg}
      />
    );
  },
};
