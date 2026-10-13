import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import snapshot from "../__fixtures__/snapshot.json";
import { toFlat } from "../data-adapter";
import type { ShellProps } from "../kit";
import Achievements, { meta as achievements } from "../Achievements";
import FpsMonitor, { meta as fps } from "../FpsMonitor";
import FramePacing, { meta as pacing } from "../FramePacing";
import GameSpotlight, { meta as spotlight } from "../GameSpotlight";
import OsdStrip, { meta as osd } from "../OsdStrip";
import PlaytimeShare, { meta as playtime } from "../PlaytimeShare";
import SteamGame, { meta as game } from "../SteamGame";
import SteamLibrary, { meta as library } from "../SteamLibrary";
import SteamNews, { meta as news } from "../SteamNews";
import SteamProfile, { meta as profile } from "../SteamProfile";
import { GROUP_D } from "./d";

const WIDGETS: [typeof fps, ComponentType<ShellProps>][] = [
  [fps, FpsMonitor],
  [spotlight, GameSpotlight],
  [osd, OsdStrip],
  [pacing, FramePacing],
  [playtime, PlaytimeShare],
  [profile, SteamProfile],
  [game, SteamGame],
  [achievements, Achievements],
  [library, SteamLibrary],
  [news, SteamNews],
];
const SIZES = ["xs", "sm", "md", "lg"] as const;
const VARIANTS = ["default", "studio"] as const;
const SKINS = ["default", "instrument", "tui"] as const;
const DATA = toFlat((snapshot as unknown as { sensors: SensorMap }).sensors);

// Every source of this group is in the captured snapshot (RTSS, Steam, libre).
const ABSENT_FROM_SNAPSHOT: string[] = [];

describe("registry group D", () => {
  it("lists the ten gaming widgets in order", () => {
    expect(GROUP_D.map((m) => m.id)).toEqual(WIDGETS.map(([m]) => m.id));
  });

  WIDGETS.forEach(([meta, Component], i) => {
    describe(meta.id, () => {
      it("mirrors its meta in the module", () => {
        expect(GROUP_D[i]).toMatchObject({ id: meta.id, minCols: meta.minSize[0], minRows: meta.minSize[1], category: "Gaming" });
      });

      for (const size of SIZES)
        for (const variant of VARIANTS)
          for (const skin of SKINS)
            it(`renders at ${size} / ${variant} / ${skin}`, () => {
              expect(renderToString(createElement(Component, { data: DATA, size, variant, skin })).length).toBeGreaterThan(0);
            });

      it("renders the empty state without data", () => {
        expect(renderToString(createElement(Component, { data: {} })).length).toBeGreaterThan(0);
      });

      it.skipIf(ABSENT_FROM_SNAPSHOT.includes(meta.id))("shows a live value from the snapshot at md", () => {
        expect(renderToString(createElement(Component, { data: DATA, size: "md" }))).toMatch(/\d/);
      });
    });
  });
});
