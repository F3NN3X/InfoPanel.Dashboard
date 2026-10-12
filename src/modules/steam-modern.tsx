import { entry, liveText, liveValue } from "@/lib/sensors";
import GameSpotlight, { meta, type GameSpotlightProps } from "@/widgets/GameSpotlight";
import { templateModule } from "@/widgets/module";
import { SPOTLIGHT_COMPOSITE_SETTINGS } from "@/widgets/spotlight-settings";
import { IDLE_SETTING } from "./standard-settings";
import type { ModuleSetting } from "./types";

/**
 * Modern Steam widget, kept loadable under its old id: the adaptive card (game banner as the
 * background with the transparent game logo on top, profile, session, playtime, library,
 * achievements, friends, news) is the `composite` layout of the `GameSpotlight` template.
 */

const P = "plugins.InfoPanel.SteamAPI.";
const PROFILE = "SteamAPI-Profile";
const SESSION = "SteamAPI-Session";
const LIBRARY = "SteamAPI-Library";

export const STEAM_MODERN_SETTINGS: ModuleSetting[] = [
  IDLE_SETTING,
  {
    key: "dimBanner",
    label: "Dim banner for text",
    type: "boolean",
    default: true,
    group: "Content",
  },
  ...SPOTLIGHT_COMPOSITE_SETTINGS,
];

export const steamModernModule = templateModule<Pick<GameSpotlightProps, "layout" | "motion" | "scrim" | "showStats" | "showNews">>({
  meta,
  Component: GameSpotlight,
  settings: STEAM_MODERN_SETTINGS,
  // Dim banner on = the template's default scrim; off = none. The old card had no Ken Burns motion.
  toProps: (s) => ({ layout: "composite", motion: false, scrim: s.dimBanner ? undefined : 0, showStats: Boolean(s.showStats), showNews: Boolean(s.showNews) }),
  // Idle = not in a game.
  isIdle: (sensors) => !liveText(entry(sensors, P, SESSION, "current-game")),
  alias: {
    id: "steammodern",
    title: "Steam (modern)",
    minCols: 2,
    minRows: 1,
    prefixes: [P],
    // No profile, game or library: hide the section.
    hidden: (sensors) =>
      !liveText(entry(sensors, P, PROFILE, "player-name")) &&
      !liveText(entry(sensors, P, SESSION, "current-game")) &&
      liveValue(entry(sensors, P, LIBRARY, "total-games")) === undefined,
  },
});
