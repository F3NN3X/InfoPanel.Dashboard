import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { ModuleSettings, SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { toFlat } from "@/widgets/data-adapter";
import type { ShellProps } from "@/widgets/kit";
import DayPlanner from "@/widgets/day-planner/DayPlanner";
import OnAirBeacon from "@/widgets/on-air-beacon/OnAirBeacon";
import RadialClockStack from "@/widgets/radial-clock-stack/RadialClockStack";
import { folderOptions, groupOf, TIME_IDS } from "./group-of";

const OPTIONS = [folderOptions("DayPlanner", DayPlanner), folderOptions("RadialClockStack", RadialClockStack), folderOptions("OnAirBeacon", OnAirBeacon)];
// The time widgets as the registry lists them, wherever each lives (group file or folder).
const TIME_WIDGETS = groupOf(TIME_IDS);
const DATA = toFlat(fixtureSensors() as SensorMap);
const defaultsOf = (settings: { key: string; default?: unknown }[]): ModuleSettings => Object.fromEntries(settings.map((d) => [d.key, d.default])) as ModuleSettings;

describe("time widgets", () => {
  it("lists the three, in order", () => {
    expect(TIME_WIDGETS.map((m) => m.id)).toEqual(["DayPlanner", "RadialClockStack", "OnAirBeacon"]);
  });

  describe.each(OPTIONS)("$meta.id", ({ meta, Component, settings, toProps }) => {
    it("keeps unique setting keys and enum defaults inside their options", () => {
      const keys = settings.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const d of settings.filter((x) => x.type === "select" && x.options)) expect(d.options!.map((o) => o.value)).toContain(d.default);
    });

    it("renders from its defaults, at the extremes and without data", () => {
      const C = Component as ComponentType<ShellProps>;
      const props = toProps(defaultsOf(settings));
      expect(renderToString(createElement(C, { data: DATA, ...props }))).not.toBe("");
      expect(renderToString(createElement(C, { data: DATA, size: "xs", variant: "studio", skin: "tui", ...props }))).not.toBe("");
      expect(renderToString(createElement(C, { data: {} }))).not.toBe("");
    });

    it("is sensorless: it renders on an empty sensor map", () => {
      const mod = TIME_WIDGETS.find((m) => m.id === meta.id)!;
      expect(mod.render({})).not.toBeNull();
    });
  });
});
