import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import snapshot from "@/widgets/__fixtures__/snapshot.json";
import { toFlat } from "@/widgets/shared/data-adapter";
import type { ShellProps } from "@/widgets/kit";
import Achievements, { meta as achievements } from "@/widgets/achievements/Achievements";
import FpsMonitor, { meta as fps } from "@/widgets/fps-monitor/FpsMonitor";
import GameSpotlight, { meta as spotlight } from "@/widgets/game-spotlight/GameSpotlight";
import OsdStrip, { meta as osd } from "@/widgets/osd-strip/OsdStrip";
import PlaytimeShare, { meta as playtime } from "@/widgets/playtime-share/PlaytimeShare";
import SteamGame, { meta as game } from "@/widgets/steam-game/SteamGame";
import SteamLibrary, { meta as library } from "@/widgets/steam-library/SteamLibrary";
import SteamNews, { meta as news } from "@/widgets/steam-news/SteamNews";
import SteamProfile, { meta as profile } from "@/widgets/steam-profile/SteamProfile";
import SteamFriends, { meta as friends } from "@/widgets/steam-friends/SteamFriends";
import { GROUP_D_IDS, groupOf } from "./group-of";

const WIDGETS: [typeof fps, ComponentType<ShellProps>][] = [
  [fps, FpsMonitor],
  [spotlight, GameSpotlight],
  [osd, OsdStrip],
  [playtime, PlaytimeShare],
  [profile, SteamProfile],
  [friends, SteamFriends],
  [game, SteamGame],
  [achievements, Achievements],
  [library, SteamLibrary],
  [news, SteamNews],
];
// Group D as the registry lists it, wherever each widget lives (group file or folder).
const GROUP_D = groupOf(GROUP_D_IDS);
const DATA = toFlat((snapshot as unknown as { sensors: SensorMap }).sensors);

// Every source of this group is in the captured snapshot (RTSS, Steam, libre).
const ABSENT_FROM_SNAPSHOT: string[] = [];

describe("registry group D", () => {
  // The Frame Pacing widget's render check, kept for the view it became (config v19).
  it("FpsMonitor's pacing view (the Frame Pacing widget) renders a live value, the extremes and the empty state", () => {
    const view = "pacing" as never;
    expect(renderToString(createElement(FpsMonitor as ComponentType<ShellProps>, { data: DATA, size: "md", view } as never))).toMatch(/\d/);
    expect(renderToString(createElement(FpsMonitor as ComponentType<ShellProps>, { data: DATA, size: "xs", variant: "studio", skin: "tui", view } as never)).length).toBeGreaterThan(0);
    expect(renderToString(createElement(FpsMonitor as ComponentType<ShellProps>, { data: {}, view } as never)).length).toBeGreaterThan(0);
  });

  it("lists the ten gaming widgets in order", () => {
    expect(GROUP_D.map((m) => m.id)).toEqual(WIDGETS.map(([m]) => m.id));
  });

  WIDGETS.forEach(([meta, Component], i) => {
    describe(meta.id, () => {
      it("mirrors its meta in the module", () => {
        expect(GROUP_D[i]).toMatchObject({ id: meta.id, minCols: meta.minSize[0], minRows: meta.minSize[1], category: "Gaming" });
      });

      it("renders a live value, the extremes and the empty state without throwing", () => {
        if (!ABSENT_FROM_SNAPSHOT.includes(meta.id)) expect(renderToString(createElement(Component, { data: DATA, size: "md" }))).toMatch(/\d/);
        expect(renderToString(createElement(Component, { data: DATA, size: "xs", variant: "studio", skin: "tui" })).length).toBeGreaterThan(0);
        expect(renderToString(createElement(Component, { data: {} })).length).toBeGreaterThan(0);
      });
    });
  });
});
