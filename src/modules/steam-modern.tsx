import { ModernSteam } from "@/components/ModernSteam";
import { isImageUrl } from "@/lib/image";
import { entry, liveText, liveValue } from "@/lib/sensors";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type ModuleSettings,
} from "./types";

/**
 * Modern Steam widget — the adaptive redesign of the classic Steam module
 * (the InfoPanel SteamAPI plugin's profile / session / library / social
 * containers). One component (`ModernSteam`) picks card / standard /
 * compact / simple from the zone's measured size and tints the surface from
 * the game banner. The classic `steam` module stays untouched.
 */

const P = "plugins.InfoPanel.SteamAPI.";
const PROFILE = "SteamAPI-Profile";
const SESSION = "SteamAPI-Session";
const LIBRARY = "SteamAPI-Library";
const ACHIEVEMENTS = "SteamAPI-Achievements";
const SOCIAL = "SteamAPI-Social";
const NEWS = "SteamAPI-News";

const STEAM_MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "layout",
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
    key: "surface",
    label: "Surface",
    type: "select",
    default: "glass",
    options: [
      { value: "glass", label: "Glass" },
      { value: "matte-light", label: "Matte (light)" },
      { value: "matte-dark", label: "Matte (dark)" },
    ],
  },
  { key: "tint", label: "Tint from game art", type: "boolean", default: true },
  { key: "showStats", label: "Stats", type: "boolean", default: true },
  { key: "showNews", label: "News line", type: "boolean", default: true },
];

function modernProps(mod: DashboardModule, s?: ModuleSettings) {
  const cfg = effectiveSettings(mod, s);
  return {
    layout: String(cfg.layout) as "auto" | "card" | "standard" | "compact" | "simple",
    surfaceStyle: String(cfg.surface) as "glass" | "matte-light" | "matte-dark",
    tint: Boolean(cfg.tint),
    showStats: Boolean(cfg.showStats),
    showNews: Boolean(cfg.showNews),
  };
}

export const steamModernModule: DashboardModule = {
  id: "steammodern",
  title: "Steam (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
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
    const banner = liveText(entry(sensors, P, PROFILE, "current_game_banner_url"));
    const logo = liveText(entry(sensors, P, PROFILE, "game_logo_url"));

    const totalGames = liveValue(entry(sensors, P, LIBRARY, "total-games"));
    const totalHours = liveValue(entry(sensors, P, LIBRARY, "total-playtime"));
    const mostPlayed = liveText(entry(sensors, P, LIBRARY, "most-played-recent"));

    const achPct = liveValue(entry(sensors, P, ACHIEVEMENTS, "current-achievements"));
    const latestAch = liveText(entry(sensors, P, ACHIEVEMENTS, "latest-achievement"));

    const friendsOnline = liveValue(entry(sensors, P, SOCIAL, "friends-online"));
    const totalFriends = liveValue(entry(sensors, P, SOCIAL, "total-friends"));

    const news = liveText(entry(sensors, P, NEWS, "current_game_news_title"));

    if (!name && !game && totalGames === undefined) return null;

    const avatarUrl =
      avatar && isImageUrl(avatar, "profile_image_url") ? avatar : undefined;
    const artUrl =
      banner && isImageUrl(banner, "current_game_banner_url")
        ? banner
        : logo && isImageUrl(logo, "game_logo_url")
          ? logo
          : undefined;

    return (
      <ModernSteam
        name={name}
        status={status}
        level={level}
        avatarUrl={avatarUrl}
        game={game}
        playtimeHours={playtime}
        sessionTime={sessionTime}
        artUrl={artUrl}
        totalGames={totalGames}
        totalHours={totalHours}
        mostPlayed={mostPlayed}
        achPct={achPct}
        latestAch={latestAch}
        friendsOnline={friendsOnline}
        totalFriends={totalFriends}
        news={news}
        {...cfg}
      />
    );
  },
};
