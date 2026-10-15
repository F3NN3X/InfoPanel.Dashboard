// What the game widgets send to the Dynamic Island (`src/lib/island/sources.ts`): FPS Monitor's game
// session, Achievements' unlocks and Steam News' new posts. Each `derive` is pure; `prev` null is the
// baseline and raises nothing.
import type { DataSourceDef, SourceNotice } from "@/lib/island/sources";
import type { Data } from "../core/types";
import { get, has, num, rows } from "../core/data";
import { widgetImage } from "../data-adapter";
import { boolSetting, numberSetting } from "../registry/settings-kit";

const RTSS = "plugins.InfoPanel.RTSS.rtss.";
const PRESENTMON = "plugins.fps-plugin.fps.";
const STEAM_GAME = "plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game";

/** The first non-zero reading of `id` from RTSS, then the PresentMon plugin. */
const live = (d: Data, id: string): number => [num(get(d, RTSS + id)), num(get(d, PRESENTMON + id))].find((v) => Number.isFinite(v) && v !== 0) ?? NaN;

/** RTSS pads the window title with zero-width characters. */
const clean = (s: string): string => s.replace(/[​﻿]/g, "").trim();

/** The running game (name and FPS), or null when nothing is captured. */
export function gameOf(d: Data): { name: string; fps: number } | null {
  const fps = live(d, "fps");
  const title = clean(get(d, `${RTSS}windowtitle`) || get(d, `${PRESENTMON}windowtitle`));
  if (!Number.isFinite(fps) || fps <= 0 || /no games|nothing to capture/i.test(title)) return null;
  const steam = clean(get(d, STEAM_GAME));
  const name = (has(title) && title !== "-" ? title : "") || (has(steam) ? steam : "") || "Game";
  return { name, fps };
}

/** Low-FPS warnings of one game at most this often, ms. */
export const FPS_COOLDOWN_MS = 120_000;

/** The running game with its FPS beside the time; optional start and low-FPS notices. */
export const fpsIsland: DataSourceDef = {
  from: "data",
  hint: "The running game and its FPS beside the time",
  defaultOn: false,
  group: "Content",
  options: [
    boolSetting("islandStart", "Game started notice", false, { hint: "Open the island when a game starts" }),
    numberSetting("islandFloor", "Low FPS warning below", 0, { min: 0, max: 240, step: 5, hint: "0 = off. Two readings in a row under it raise a warning (every 2 min at most)" }),
  ],
  derive(prev, next, settings) {
    const now = gameOf(next);
    const activity = now ? { id: "game", title: now.name, subtitle: `${Math.round(now.fps)} FPS` } : null;
    // The streams arrive one by one: a pass before the FPS keys came is no baseline.
    if (!prev || !(has(get(prev, `${RTSS}fps`)) || has(get(prev, `${PRESENTMON}fps`)))) return { activity };
    const was = gameOf(prev);
    const notices: SourceNotice[] = [];
    if (now && settings.islandStart === true && (!was || was.name !== now.name)) {
      notices.push({ id: "start", severity: "info", title: now.name, body: "Game started", ttl: 3000 });
    }
    const floor = Number(settings.islandFloor) || 0;
    if (now && was && floor > 0 && now.fps < floor && was.fps < floor) {
      notices.push({ id: "low", severity: "warning", title: `${Math.round(now.fps)} FPS`, body: `${now.name} is under ${floor} FPS`, ttl: 5000, cooldownMs: FPS_COOLDOWN_MS });
    }
    return { notices, activity };
  },
};

const ACH = "plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.";

/** A new latest achievement, with its icon. */
export const achievementsIsland: DataSourceDef = {
  from: "data",
  hint: "An achievement unlocked, with its icon",
  defaultOn: false,
  group: "Achievements",
  reads: [ACH, STEAM_GAME],
  derive(prev, next) {
    const name = get(next, `${ACH}latest-achievement`);
    const was = prev ? get(prev, `${ACH}latest-achievement`) : "";
    // The streams arrive one by one: a pass before this key came is no baseline.
    if (!has(was) || !has(name) || name === was) return {};
    const image = widgetImage(get(next, `${ACH}latest-achievement-icon`));
    const game = get(next, STEAM_GAME);
    return {
      notices: [{ id: `ach:${name}`, severity: "info", title: "Achievement unlocked", body: has(game) ? `${name} · ${game}` : name, ...(image ? { image } : {}), ttl: 6000 }],
    };
  },
};

const NEWS = "plugins.InfoPanel.SteamAPI.SteamAPI-News.library-news";
/** "Game, Title (may hold commas), Mon DD" rows as `game` and `title`. */
const newsOf = (d: Data) => rows(get(d, NEWS)).map((r) => ({ game: r[0], title: r.slice(1, -1).join(", ") }));

/** A post that was not in the list before: the first new one per refresh, so a reload raises one. */
export const steamNewsIsland: DataSourceDef = {
  from: "data",
  hint: "A new post for a game in your library",
  defaultOn: false,
  group: "Steam news",
  reads: [NEWS],
  derive(prev, next) {
    if (!prev || !has(get(prev, NEWS))) return {};
    const seen = new Set(newsOf(prev).map((n) => `${n.game}|${n.title}`));
    const fresh = newsOf(next).find((n) => n.title !== "" && !seen.has(`${n.game}|${n.title}`));
    return fresh ? { notices: [{ id: `news:${fresh.game}|${fresh.title}`, severity: "info", title: fresh.game, body: fresh.title, ttl: 6000, cooldownMs: 86_400_000 }] } : {};
  },
};
