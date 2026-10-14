import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import { fixtureSensors } from "../__fixtures__";
import { toFlat } from "../data-adapter";
import type { ShellProps } from "../kit";
import Bluetooth, { meta as bluetooth } from "../Bluetooth";
import Departures, { meta as departures } from "../Departures";
import Notifications, { meta as notifications } from "../Notifications";
import StreamDeck, { meta as streamDeck } from "../StreamDeck";
import TextFile, { meta as textFile } from "../TextFile";
import WebPage, { meta as webPage } from "../WebPage";
import { GROUP_E } from "./e";

// [meta, component, category, props that give the widget something to show]
const WIDGETS: [typeof webPage, ComponentType<ShellProps>, string, Record<string, unknown>][] = [
  [webPage, WebPage, "Generic", { url: "https://example.com" }],
  [textFile, TextFile, "Info", {}],
  [notifications, Notifications, "Info", {}],
  [departures, Departures, "Info", {}],
  [bluetooth, Bluetooth, "Generic", {}],
  [streamDeck, StreamDeck, "Generic", {}],
];
const SIZES = ["xs", "sm", "md", "lg"] as const;
const VARIANTS = ["default", "studio"] as const;
const SKINS = ["default", "instrument", "tui"] as const;
const DATA = toFlat(fixtureSensors() as SensorMap);

describe("registry group E", () => {
  it("lists the widgets in order", () => {
    expect(GROUP_E.map((m) => m.id)).toEqual(WIDGETS.map(([m]) => m.id));
  });

  WIDGETS.forEach(([meta, Component, category, props], i) => {
    describe(meta.id, () => {
      it("mirrors its meta in the module", () => {
        expect(GROUP_E[i]).toMatchObject({ id: meta.id, minCols: meta.minSize[0], minRows: meta.minSize[1], category });
      });

      for (const size of SIZES)
        for (const variant of VARIANTS)
          for (const skin of SKINS)
            it(`renders at ${size} / ${variant} / ${skin}`, () => {
              expect(renderToString(createElement(Component, { data: DATA, size, variant, skin, ...props })).length).toBeGreaterThan(0);
            });

      it("renders the empty state without data", () => {
        expect(renderToString(createElement(Component, { data: {} })).length).toBeGreaterThan(0);
      });
    });
  });
});
