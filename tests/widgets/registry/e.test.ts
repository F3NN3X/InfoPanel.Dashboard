import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SensorMap } from "@/modules/types";
import { fixtureSensors } from "@/widgets/__fixtures__";
import { toFlat } from "@/widgets/data-adapter";
import type { ShellProps } from "@/widgets/kit";
import Bluetooth, { meta as bluetooth } from "@/widgets/bluetooth/Bluetooth";
import Departures, { meta as departures } from "@/widgets/departures/Departures";
import Notifications, { meta as notifications } from "@/widgets/notifications/Notifications";
import TextFile, { meta as textFile } from "@/widgets/text-file/TextFile";
import WebPage, { meta as webPage } from "@/widgets/web-page/WebPage";
import { GROUP_E_IDS, groupOf } from "./group-of";

// [meta, component, category, props that give the widget something to show]
const WIDGETS: [typeof webPage, ComponentType<ShellProps>, string, Record<string, unknown>][] = [
  [webPage, WebPage, "Generic", { url: "https://example.com" }],
  [textFile, TextFile, "Info", {}],
  [notifications, Notifications, "Info", {}],
  [departures, Departures, "Info", {}],
  [bluetooth, Bluetooth, "Generic", {}],
];
// Group E as the registry lists it, wherever each widget lives (group file or folder).
const GROUP_E = groupOf(GROUP_E_IDS);
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

      it("renders with data, at the extremes and without data", () => {
        expect(renderToString(createElement(Component, { data: DATA, size: "md", ...props })).length).toBeGreaterThan(0);
        expect(renderToString(createElement(Component, { data: DATA, size: "xs", variant: "studio", skin: "tui", ...props })).length).toBeGreaterThan(0);
        expect(renderToString(createElement(Component, { data: {} })).length).toBeGreaterThan(0);
      });
    });
  });
});
