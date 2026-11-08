// SteamGame's catalog entry: pure data, so the registry and the generator read it without the component.
import type { WidgetMeta } from "../core/types";

export const meta: WidgetMeta = {
  id: "SteamGame",
  name: "Current Game",
  category: "Gaming",
  icon: "stadia_controller",
  prefixes: ["plugins.InfoPanel.SteamAPI.SteamAPI-Session.", "plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.", "plugins.InfoPanel.SteamAPI.SteamAPI-Profile.current_game_banner_url", "plugins.InfoPanel.SteamAPI.SteamAPI-Profile.game_"],
  defaultSize: [4, 2],
  minSize: [2, 1],
  blurb: "Session and total playtime",
  tags: "steam session",
  description: "Game hero art, session time, total playtime, average session and achievement progress.",
};
