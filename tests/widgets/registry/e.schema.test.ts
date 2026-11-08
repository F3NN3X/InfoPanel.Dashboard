import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { STANDARD_SETTINGS } from "@/modules/standard-settings";
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import { toFlat } from "@/widgets/data-adapter";
import { fixtureSensors } from "@/widgets/__fixtures__";
import type { SensorMap } from "@/modules/types";
import Bluetooth from "@/widgets/bluetooth/Bluetooth";
import Departures from "@/widgets/departures/Departures";
import Notifications from "@/widgets/notifications/Notifications";
import TextFile from "@/widgets/text-file/TextFile";
import WebPage from "@/widgets/web-page/WebPage";
import { folderOptions } from "./group-of";

// These templates have no handoff spec: the manifest is the props each component's own interface declares
// (beyond ShellProps and `look`), with the setting key that carries each.
const MANIFEST = [
  { id: "WebPage", options: folderOptions("WebPage", WebPage), props: { url: "url" } },
  { id: "TextFile", options: folderOptions("TextFile", TextFile), props: { showMeta: "showMeta" } },
  { id: "Notifications", options: folderOptions("Notifications", Notifications), props: { showHistory: "showHistory", maxLines: "maxLines" } },
  { id: "Departures", options: folderOptions("Departures", Departures), props: { showStatus: "showStatus" } },
  {
    id: "Bluetooth",
    options: folderOptions("Bluetooth", Bluetooth),
    props: { showStatus: "showStatus", showDevices: "showDevices", showBattery: "showBattery", batteryMidColor: "batteryMidColor", batteryLowColor: "batteryLowColor" },
  },
] as const;

const STANDARD_KEYS = new Set(STANDARD_SETTINGS.map((d) => d.key));
const DATA = toFlat(fixtureSensors() as SensorMap);
const defaultsOf = (settings: ModuleSetting[]): ModuleSettings => Object.fromEntries(settings.map((d) => [d.key, d.default]));

describe.each(MANIFEST)("$id schema", ({ options, props }) => {
  const settings = options.settings;

  it("keeps the manifest, keys and enum defaults, and renders from its defaults", () => {
    for (const key of Object.values(props)) expect(settings.filter((d) => d.key === key)).toHaveLength(1);
    { // maps every widget-specific setting to a prop
      const own = settings.filter((d) => !STANDARD_KEYS.has(d.key) && d.key !== "view");
      for (const d of own) expect(Object.values(props)).toContain(d.key);
    }
    { // has unique keys, none colliding with a standard key other than shell-level ones
      const keys = settings.map((d) => d.key);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of Object.values(props)) expect(STANDARD_KEYS.has(key)).toBe(false);
    }
    { // keeps every enum default inside its options
      for (const d of settings.filter((x) => x.type === "select" && x.options)) expect(d.options!.map((o) => o.value)).toContain(d.default);
    }
    { // renders from its defaults
      const toProps = options.toProps as (s: ModuleSettings) => object;
      const p = toProps(defaultsOf(settings));
      const html = renderToString(createElement(options.Component as never, { data: DATA, ...p, ...(options.meta.id === "WebPage" ? { url: "https://example.com" } : {}) }));
      expect(html.length).toBeGreaterThan(0);
    }
  });
});
